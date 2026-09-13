require('dotenv').config();
const {
  Client, GatewayIntentBits, REST, Routes,
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');

const TOKEN     = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const API_KEY   = process.env.RBLXVALUE_API_KEY;
const BASE_URL  = 'https://api.rblxvalue.com/v2';
const FOOTER    = 'Data from rblxvalue.com';

async function api(path) {
  const res = await fetch(BASE_URL + path, {
    headers: { 'X-Api-Key': API_KEY },
    signal: AbortSignal.timeout(5000),
  });
  return res.json();
}

const fmt = (v) => {
  v = parseInt(v) || 0;
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000)     return (v / 1_000).toFixed(1) + 'k';
  return v.toLocaleString();
};
const demandBar = (d) => {
  d = Math.min(Math.max(parseInt(d) || 0, 0), 10);
  return '█'.repeat(d) + '░'.repeat(10 - d) + ` ${d}/10`;
};

// ── Register slash commands ────────────────────────────────
const commands = [
  new SlashCommandBuilder().setName('item').setDescription('Look up an MM2 item value')
    .addStringOption(o => o.setName('name').setDescription('Item name, slug or acronym').setRequired(true)),
  new SlashCommandBuilder().setName('set').setDescription('Look up an MM2 set')
    .addStringOption(o => o.setName('name').setDescription('Set name or an item in the set').setRequired(true)),
  new SlashCommandBuilder().setName('top').setDescription('Top 10 most valuable MM2 items')
    .addStringOption(o => o.setName('category').setDescription('Filter by category (e.g. Knife, Gun, Pet)').setRequired(false)),
  new SlashCommandBuilder().setName('profile').setDescription('Look up a RBLXValue profile')
    .addStringOption(o => o.setName('username').setDescription('Roblox username').setRequired(true)),
  new SlashCommandBuilder().setName('history').setDescription('Recent value history for an item')
    .addStringOption(o => o.setName('name').setDescription('Item name, slug or acronym').setRequired(true)),
].map(c => c.toJSON());

new REST({ version: '10' }).setToken(TOKEN)
  .put(Routes.applicationCommands(CLIENT_ID), { body: commands })
  .then(() => console.log('Slash commands registered'))
  .catch(console.error);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('clientReady', () => {
  console.log(`Ready: ${client.user.tag}`);
  client.user.setPresence({ activities: [{ name: '/item | rblxvalue.com', type: 2 }], status: 'online' });
});

const linkButton = (label, url) =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel(label).setURL(url).setStyle(ButtonStyle.Link));

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  await interaction.deferReply();
  const { commandName } = interaction;

  // ── /item ────────────────────────────────────────────────
  if (commandName === 'item') {
    const name = interaction.options.getString('name');
    let data = await api(`/items/${encodeURIComponent(name)}`);
    let item = data.item;
    if (!item) {
      const s = await api(`/items?search=${encodeURIComponent(name)}&limit=1`);
      item = s.items?.[0];
    }
    if (!item) return interaction.editReply(`❌ Item not found: **${name}**`);

    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle(item.name)
      .setURL(`https://rblxvalue.com/item/${item.slug}`)
      .addFields(
        { name: '💎 Value',     value: fmt(item.value),          inline: true },
        { name: '🏷️ Category',  value: item.category || '—',     inline: true },
        { name: '📈 Stability', value: item.stability || '—',    inline: true },
        { name: '🔵 MM2Values', value: fmt(item.value_source_a), inline: true },
        { name: '🟣 Supreme',   value: fmt(item.value_source_b), inline: true },
        { name: '\u200b',       value: '\u200b',            inline: true },
      )
      .setFooter({ text: FOOTER }).setTimestamp();
    if (item.demand > 0) embed.addFields({ name: '📊 Demand', value: demandBar(item.demand) });
    if (item.image_url) embed.setThumbnail(item.image_url);

    return interaction.editReply({ embeds: [embed], components: [linkButton('View on RBLXValue', `https://rblxvalue.com/item/${item.slug}`)] });
  }

  // ── /set ─────────────────────────────────────────────────
  if (commandName === 'set') {
    const name = interaction.options.getString('name');
    const data = await api(`/sets/${encodeURIComponent(name)}`);
    const set = data.set;
    if (!set) return interaction.editReply(`❌ Set not found: **${name}**`);

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle(set.name)
      .setURL(`https://rblxvalue.com/sets/${set.slug}`)
      .addFields(
        { name: '💎 Total Value', value: fmt(set.total_value), inline: true },
        { name: '📦 Items',       value: String(set.item_count || 0), inline: true },
      )
      .setFooter({ text: FOOTER }).setTimestamp();
    if (set.items?.length) {
      const lines = set.items.slice(0, 15).map(i => `**${i.name}** — ${fmt(i.value)}`);
      if (set.items.length > 15) lines.push(`*...and ${set.items.length - 15} more*`);
      embed.addFields({ name: 'Items in this set', value: lines.join('\n') });
    }
    if (set.image_url) embed.setThumbnail(set.image_url);

    return interaction.editReply({ embeds: [embed], components: [linkButton('View on RBLXValue', `https://rblxvalue.com/sets/${set.slug}`)] });
  }

  // ── /top ─────────────────────────────────────────────────
  if (commandName === 'top') {
    const category = interaction.options.getString('category');
    const data = await api(`/items?limit=10${category ? `&category=${encodeURIComponent(category)}` : ''}`);
    if (!data.items?.length) return interaction.editReply(`❌ No items found${category ? ` for **${category}**` : ''}.`);

    const medals = ['🥇', '🥈', '🥉'];
    const lines = data.items.map((it, i) =>
      `${medals[i] || `\`#${i + 1}\``} **${it.name}** — 💎 ${fmt(it.value)}`);

    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle(category ? `Top 10 — ${category}` : 'Top 10 Most Valuable Items')
      .setDescription(lines.join('\n'))
      .setFooter({ text: FOOTER }).setTimestamp();

    const url = category
      ? `https://rblxvalue.com/index?category=${encodeURIComponent(category.toLowerCase())}`
      : 'https://rblxvalue.com/index';
    return interaction.editReply({ embeds: [embed], components: [linkButton('View on RBLXValue', url)] });
  }

  // ── /profile ─────────────────────────────────────────────
  if (commandName === 'profile') {
    const username = interaction.options.getString('username');
    const data = await api(`/profile/${encodeURIComponent(username)}`);
    const p = data.profile;
    if (!p) return interaction.editReply(`❌ Profile not found: **${username}**`);

    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle(`${p.display_name} (@${p.username})`)
      .setURL(p.profile_url)
      .addFields(
        { name: '💎 Inventory Value', value: p.inventory_public ? fmt(p.total_value) : 'Private', inline: true },
        { name: '📦 Items',           value: p.inventory_public ? String(p.item_count) : 'Private', inline: true },
        { name: '🏆 Badge',           value: p.top_badge_label || 'None', inline: true },
      )
      .setFooter({ text: FOOTER }).setTimestamp();
    if (p.avatar_url) embed.setThumbnail(p.avatar_url);

    return interaction.editReply({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('View Profile').setURL(p.profile_url).setStyle(ButtonStyle.Link),
        new ButtonBuilder().setLabel('Roblox Profile').setURL(`https://www.roblox.com/users/${p.roblox_id}/profile`).setStyle(ButtonStyle.Link),
      )],
    });
  }

  // ── /history ─────────────────────────────────────────────
  if (commandName === 'history') {
    const name = interaction.options.getString('name');
    const data = await api(`/history/${encodeURIComponent(name)}?period=1Y`);
    if (data.error || !data.item) return interaction.editReply(`❌ Item not found: **${name}**`);
    if (!data.history?.length) return interaction.editReply(`No history yet for **${data.item.name}**.`);

    // Latest value per source
    const latest = {};
    for (const p of data.history) latest[p.source] = p;
    const lines = Object.values(latest).map(p => `**${p.source}** — ${fmt(p.value)} _(as of ${p.date})_`);

    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle(`Value history — ${data.item.name}`)
      .setURL(`https://rblxvalue.com/history/${data.item.slug}`)
      .setDescription(lines.join('\n'))
      .addFields({ name: 'Data points', value: String(data.count), inline: true })
      .setFooter({ text: FOOTER }).setTimestamp();

    return interaction.editReply({ embeds: [embed], components: [linkButton('View history on RBLXValue', `https://rblxvalue.com/history/${data.item.slug}`)] });
  }
});

client.login(TOKEN);
