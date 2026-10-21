import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const config = JSON.parse(fs.readFileSync(path.join(root, "docs.json"), "utf8"));
const failures = [];

const fail = (message) => failures.push(message);
const language = (code) => config.navigation.languages.find((entry) => entry.language === code);
const routes = (entry) => entry.groups.flatMap((group) => group.pages);
const enRoutes = routes(language("en"));
const cnRoutes = routes(language("cn"));
const canonicalCnRoutes = cnRoutes.map((route) => route.replace(/^cn\//, ""));

if (enRoutes.length !== 26 || cnRoutes.length !== 26) {
  fail(`expected 26 EN and 26 CN routes, got ${enRoutes.length} and ${cnRoutes.length}`);
}
if (new Set(enRoutes).size !== enRoutes.length || new Set(cnRoutes).size !== cnRoutes.length) {
  fail("navigation contains duplicate routes");
}
if (JSON.stringify([...enRoutes].sort()) !== JSON.stringify([...canonicalCnRoutes].sort())) {
  fail("EN and CN route sets are not mirrors");
}

const redirects = config.redirects ?? [];
const redirectSources = redirects.map((redirect) => redirect.source);
if (new Set(redirectSources).size !== redirectSources.length) {
  fail("docs.json contains duplicate redirect sources");
}
const publishedPaths = new Set(
  [...enRoutes, ...cnRoutes].map((route) => (route === "index" ? "/" : route === "cn/index" ? "/cn" : `/${route}`)),
);
for (const redirect of redirects) {
  if (!publishedPaths.has(redirect.destination)) {
    fail(`redirect destination is not published: ${redirect.source} -> ${redirect.destination}`);
  }
}

const pagePath = (route) => path.join(root, `${route}.mdx`);
const textFor = (route) => {
  const filename = pagePath(route);
  if (!fs.existsSync(filename)) {
    fail(`missing page: ${route}`);
    return "";
  }
  return fs.readFileSync(filename, "utf8");
};
const stripFences = (text) =>
  text
    // Markdown fenced code blocks.
    .replace(/```[\s\S]*?```/g, "")
    // JSX <pre>...</pre> code blocks (may contain literal '#' shell comments
    // that must not be mistaken for Markdown headings).
    .replace(/<pre[\s\S]*?<\/pre>/g, "");
const headingLevels = (text) =>
  [...stripFences(text).matchAll(/^(#{1,3})\s+.+$/gm)].map((match) => match[1].length);
const fenceLanguages = (text) => [...text.matchAll(/^```([^\n]*)$/gm)].map((match) => match[1]);
const componentCount = (text, component) =>
  [...text.matchAll(new RegExp(`<${component}(?:\\s|>)`, "g"))].length;
const internalLinks = (text) => {
  const links = [];
  for (const match of text.matchAll(/\]\((\/[^)#?]*(?:#[^)]*)?)\)|href=["'](\/[^"']*)["']/g)) {
    links.push(match[1] || match[2]);
  }
  return links.sort();
};
const externalLinks = (text) => [...stripFences(text).matchAll(/\]\((https:\/\/[^)]+)\)|href=["'](https:\/\/[^"']+)["']/g)]
  .map((match) => match[1] || match[2]).sort();
const attributeValue = (attributes, name) => {
  const match = attributes.match(new RegExp(`(?:^|\\s)${name}=(["'])(.*?)\\1`));
  return match?.[2];
};
const anchorTags = (text) => [...text.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((match) => ({
  attributes: match[1],
  content: match[2],
  full: match[0],
}));
const languageContextPattern = (className) =>
  new RegExp(`<div\\b[^>]*className="[^"]*${className}[^"]*"[^>]*>([\\s\\S]*?)<\\/div>`, "g");
const visibleText = (html) => html.replace(/<[^>]+>/g, "").trim();
const validateHomepageLanguageSelectors = (text, currentLanguage) => {
  const languageAnchors = [];
  const expectedAnchors = [
    { href: "/", hrefLang: "en", lang: "en", label: "EN" },
    { href: "/cn", hrefLang: "zh-CN", lang: "zh-CN", label: "中文" },
  ];

  for (const context of ["aibeat-home-nav-language", "aibeat-home-mobile-language"]) {
    const groups = [...text.matchAll(languageContextPattern(context))];
    if (groups.length !== 1) {
      fail(`index: expected one ${context} language-selector group`);
      continue;
    }

    const anchors = anchorTags(groups[0][1]);
    if (anchors.length !== expectedAnchors.length) {
      fail(`index: ${context} must contain exactly two language anchors`);
      continue;
    }

    for (const expected of expectedAnchors) {
      const matches = anchors.filter((anchor) => attributeValue(anchor.attributes, "hrefLang") === expected.hrefLang);
      if (matches.length !== 1) {
        fail(`index: ${context} must contain exactly one ${expected.hrefLang} language anchor`);
        continue;
      }

      const anchor = matches[0];
      const expectedCurrent = expected.hrefLang === currentLanguage ? "page" : undefined;
      if (
        attributeValue(anchor.attributes, "href") !== expected.href ||
        attributeValue(anchor.attributes, "lang") !== expected.lang ||
        visibleText(anchor.content) !== expected.label ||
        attributeValue(anchor.attributes, "aria-current") !== expectedCurrent
      ) {
        fail(`index: ${context} has an invalid ${expected.hrefLang} language anchor`);
        continue;
      }
      languageAnchors.push(anchor.full);
    }
  }

  const allLanguageAnchors = anchorTags(text).filter((anchor) => attributeValue(anchor.attributes, "hrefLang") !== undefined);
  if (allLanguageAnchors.length !== 4) {
    fail("index: homepage must expose exactly two validated language-selector groups");
  }
  return languageAnchors;
};
const withoutValidatedLanguageAnchors = (text, languageAnchors) =>
  languageAnchors.reduce((result, anchor) => result.replaceAll(anchor, ""), text);
const homeStructure = (text) => [...text.matchAll(/<(\/?)(div|section|h[1-4]|p|a|span|strong|ul|ol|li|code|pre|small|img|b)\b[^>]*>/g)]
  .map((match) => `${match[1]}${match[2]}:${match[0].match(/className="([^"]+)"/)?.[1] ?? ""}`);
const normalizeCnLink = (link) => {
  if (link === "/cn") return "/";
  return link.startsWith("/cn/") ? link.slice(3) : link;
};
const frontmatter = (text) => {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return {};
  return Object.fromEntries(
    [...match[1].matchAll(/^([\w-]+):\s*(.+)$/gm)].map((entry) => [entry[1], entry[2].trim()]),
  );
};
const components = [
  "Card",
  "CardGroup",
  "Steps",
  "Step",
  "Tabs",
  "Tab",
  "AccordionGroup",
  "Accordion",
  "Note",
  "Info",
  "Warning",
  "Tip",
];
const forbidden = [
  [/promptUtils/, "malformed promptUtils path"],
  [/"schema_version"\s*:\s*"agent-case-v1"/, "obsolete AgentCase schema"],
  [/"sample_role"\s*:\s*"(?:evaluation|standard|adversarial)"/, "invalid AgentCase sample_role"],
  [/\b(?:Promptbeat|Agentbeat)\b/, "product-name casing drift"],
  [/\b(?:MIT License|Apache(?: License)? 2(?:\.0)?)\b/i, "unverified license claim"],
  [/receipt[^\n]{0,80}\b(?:signature|signed)\b/i, "receipt described as a signature"],
];

for (const route of enRoutes) {
  const cnRoute = route === "index" ? "cn/index" : `cn/${route}`;
  const en = textFor(route);
  const cn = textFor(cnRoute);
  const enFrontmatter = frontmatter(en);
  const cnFrontmatter = frontmatter(cn);
  const languageAnchors = route === "index"
    ? {
      en: validateHomepageLanguageSelectors(en, "en"),
      cn: validateHomepageLanguageSelectors(cn, "zh-CN"),
    }
    : { en: [], cn: [] };
  const enForLinkParity = withoutValidatedLanguageAnchors(en, languageAnchors.en);
  const cnForLinkParity = withoutValidatedLanguageAnchors(cn, languageAnchors.cn);

  for (const key of ["title", "description"]) {
    if (!enFrontmatter[key]) fail(`${route}: missing EN ${key}`);
    if (!cnFrontmatter[key]) fail(`${route}: missing CN ${key}`);
  }
  if (headingLevels(en).filter((level) => level === 1).length !== 0) {
    fail(`${route}: EN source must rely on the frontmatter title for its single rendered H1`);
  }
  if (headingLevels(cn).filter((level) => level === 1).length !== 0) {
    fail(`${route}: CN source must rely on the frontmatter title for its single rendered H1`);
  }
  if (JSON.stringify(headingLevels(en)) !== JSON.stringify(headingLevels(cn))) {
    fail(`${route}: heading structure differs between EN and CN`);
  }
  if (JSON.stringify(fenceLanguages(en)) !== JSON.stringify(fenceLanguages(cn))) {
    fail(`${route}: code-fence sequence differs between EN and CN`);
  }
  for (const component of components) {
    if (componentCount(en, component) !== componentCount(cn, component)) {
      fail(`${route}: ${component} count differs between EN and CN`);
    }
  }
  const normalizedCnLinks = internalLinks(cnForLinkParity).map(normalizeCnLink).sort();
  if (JSON.stringify(internalLinks(enForLinkParity)) !== JSON.stringify(normalizedCnLinks)) {
    fail(`${route}: internal links differ between EN and CN`);
  }
  // Community pages have their own zh locale, unlike the docs site's cn.
  const normalizeCommunityLink = (link) => link.replace(/^https:\/\/seeds\.aibeat\.ai\/zh\/submit\/$/, 'https://seeds.aibeat.ai/submit/');
  if (JSON.stringify(externalLinks(en)) !== JSON.stringify(externalLinks(cn).map(normalizeCommunityLink).sort())) {
    fail(`${route}: external links (including release downloads) differ between EN and CN`);
  }
  if (route === "index") {
    for (const [label, text, href, wording] of [
      ['EN', en, 'https://discord.gg/NXXz8JG74', ['First community incentives underway', 'Discord', 'official credit', 'website showcase', 'Ambassador']],
      ['CN', cn, 'https://discord.gg/NXXz8JG74', ['首批社区激励进行中', 'Discord', '官方署名', '官网展示', 'Ambassador']],
    ]) {
      const banners = anchorTags(text).filter(a => attributeValue(a.attributes, 'className') === 'aibeat-home-seeds-recruitment');
      if (banners.length !== 1 || attributeValue(banners[0].attributes, 'href') !== href || !wording.every(w => visibleText(banners[0].content).includes(w))) {
        fail(`index: ${label} incentive banner must match community-incentive copy and Discord destination`);
      }
      if (!text.includes('https://discord.gg/NXXz8JG74') || text.includes('8A6mFckxZ')) fail(`index: ${label} has an outdated Discord invite`);
      const tryCta = anchorTags(text).filter(a => attributeValue(a.attributes, 'className') === 'aibeat-home-seeds-recruitment-try');
      const tryHref = label === 'CN' ? '/cn/try' : '/try';
      if (tryCta.length !== 1 || attributeValue(tryCta[0].attributes, 'href') !== tryHref) fail(`index: ${label} incentive banner needs one participation-example link to ${tryHref}`);
    }
    if (config.footer?.socials?.discord !== 'https://discord.gg/NXXz8JG74') fail('docs.json: outdated Discord invite');
  }
  if (route === "try") {
    for (const [label, text, wording] of [
      ['EN', en, ['Seed Community campaign is live', 'October 31', 'Ambassador', 'your own Agent']],
      ['CN', cn, ['限时种子社区共建活动已开始', '10 月 31 日', 'Ambassador', '你自己的 Agent']],
    ]) {
      const btns = anchorTags(text).filter(a => attributeValue(a.attributes, 'className') === 'aibeat-try-incentive-btn');
      if (btns.length !== 1 || attributeValue(btns[0].attributes, 'href') !== 'https://discord.gg/NXXz8JG74') fail(`try: ${label} incentive card needs one Join Discord button to the current invite`);
      if (!wording.every(w => text.includes(w))) fail(`try: ${label} incentive card or reference-only note is missing required copy`);
      const posterSrc = label === 'CN' ? '/images/seeds-campaign-poster-zh.webp' : '/images/seeds-campaign-poster-en.webp';
      if ((text.match(new RegExp(`src="${posterSrc}"`, 'g')) || []).length !== 2 || !fs.existsSync(path.join(root, posterSrc))) fail(`try: ${label} hover poster (thumbnail + popover) must use its own-language image ${posterSrc}`);
      if (/不是同一套东西|are different products\. Pick one tab/.test(text)) fail(`try: ${label} still has the removed intro sentence`);
    }
  }
  if (route === "index" && JSON.stringify(homeStructure(en)) !== JSON.stringify(homeStructure(cn))) {
    fail("index: custom homepage HTML/class structure differs between EN and CN");
  }
  for (const [label, text] of [["EN", en], ["CN", cn]]) {
    for (const link of internalLinks(text)) {
      if (/^\/cn\/downloads\//.test(link)) fail(`${route}: ${label} incorrectly localizes download asset ${link}`);
      if (link.startsWith("/downloads/") && !fs.existsSync(path.join(root, link.split(/[?#]/)[0]))) {
        fail(`${route}: ${label} download asset is missing: ${link}`);
      }
    }
  }

  for (const [pattern, message] of forbidden) {
    if (pattern.test(en) || pattern.test(cn)) fail(`${route}: ${message}`);
  }
  for (const [label, text] of [["EN", en], ["CN", cn]]) {
    for (const match of text.matchAll(/```json\n([\s\S]*?)\n```/g)) {
      try {
        JSON.parse(match[1]);
      } catch (error) {
        fail(`${route}: invalid ${label} JSON fence: ${error.message}`);
      }
    }
    for (const char of text) {
      if (/\p{Cf}/u.test(char)) {
        fail(`${route}: ${label} contains Unicode format control U+${char.codePointAt(0).toString(16).toUpperCase()}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error(`Bilingual site check failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Bilingual site check passed: ${enRoutes.length} EN + ${cnRoutes.length} CN routes, ${redirects.length} redirects.`);
