// ops-analytics.js — aibeat 官网运营事件埋点（Layer 2）
// -----------------------------------------------------------------------------
// 状态：已上线。docs.json → integrations.ga4 已接入真实 measurement ID，
//       本文件随 Mintlify 根 JS 自动注入，通过 window.gtag 直接上报。
//
// 设计约束（见任务卡 §4.2 / §4.3）：
//   - Mintlify 会自动把与 docs.json 同级的根 JS 注入每个页面（同 localization.js）。
//   - pageview 由平台 integration 负责（Layer 1），本文件只管关键跳转 / UI 事件。
//   - 事件名是冻结字典，禁止随意改（§4.3）。
//   - fail-open：埋点任何异常都不得阻断导航或点击。
//   - 不追踪用户身份、不写 cookie、不做跨站串联。
//   - 中英首页共用同一套逻辑，不复制业务代码。
//
// 上报通道：优先 window.gtag（GA4 integration 注入的全局函数）。
//           gtag 不存在时静默入队/丢弃，绝不抛错。
// -----------------------------------------------------------------------------
(() => {
  "use strict";

  // ---- 幂等守卫：Mintlify SPA 若在路由切换时重新执行根 JS，避免重复绑定导致事件双报 ----
  if (window.__opsAnalyticsInit) return;
  window.__opsAnalyticsInit = true;

  // ---- 冻结事件字典（§4.3）。key = event 名，value = 允许的 placement 枚举 ----
  // placement 未命中枚举时归 "other"，禁止自由文本爆炸。
  const PLACEMENTS = {
    outbound_discord: ["nav_social", "top_incentive", "try_incentive", "seeds_cta", "seeds_secondary", "contact_pills", "footer", "other"],
    outbound_seeds: ["navbar", "seeds_submit", "seeds_browse", "other"],
    outbound_github: ["nav_social", "contact_pills", "footer", "release_notes", "other"],
    outbound_x: ["nav_social", "contact_pills", "footer", "other"],
    download_promptbeat: ["hero", "platform_menu", "other"],
    download_agentbeat: ["hero", "platform_menu", "other"],
    download_skill: ["skills_overview", "other"],
    wecom_open: ["nav_desktop", "nav_mobile", "other"],
    try_open: ["top_incentive", "seeds_incentive", "other"],
    poster_view: ["try_incentive", "other"],
  };

  const normPlacement = (event, raw) => {
    const allowed = PLACEMENTS[event];
    if (!allowed) return "other";
    return allowed.includes(raw) ? raw : "other";
  };

  // ---- 环境属性 ----
  const isZh = () => /^\/cn(?:\/|$)/.test(location.pathname);
  const locale = () => (isZh() ? "cn" : "en");
  const pagePath = () => location.pathname || "/";

  // ---- 上报：唯一出口，fail-open ----
  function report(event, params) {
    try {
      const payload = Object.assign({ page_path: pagePath(), locale: locale() }, params || {});
      if (typeof window.gtag === "function") {
        window.gtag("event", event, payload);
      }
      // gtag 未就绪（如 measurement ID 未接线 / preview 关分析）时静默。
      // 需要本地联调可临时打开下一行：
      // console.debug("[ops-analytics]", event, payload);
    } catch {
      /* 埋点失败绝不影响页面行为 */
    }
  }

  // ---- host+path，用于 outbound 事件的 dest 属性 ----
  function destOf(url) {
    try {
      const u = new URL(url, location.href);
      return u.host + u.pathname.replace(/\/$/, "");
    } catch {
      return "";
    }
  }

  // ---- 归因：先看显式 data-ops-*，再按 URL / DOM 上下文推断 placement ----
  // 优先 URL 匹配，尽量不改 MDX；特殊入口可在 <a> 上加 data-ops-event / data-ops-placement 覆盖。
  function classify(anchor) {
    const href = anchor.getAttribute("href") || "";
    const explicitEvent = anchor.dataset.opsEvent;
    const explicitPlacement = anchor.dataset.opsPlacement;

    // Discord：匹配 discord.gg / discord.com/invite（应对 invite 轮换）
    if (/(^|\/\/)discord\.gg\//i.test(href) || /discord\.com\/invite\//i.test(href) || explicitEvent === "outbound_discord") {
      return { event: "outbound_discord", placement: explicitPlacement || discordPlacement(anchor) };
    }

    // 种子站：真正离开到 seeds.aibeat.ai 才算（站内 #seeds 锚点不算）
    if (/(^|\/\/)seeds\.aibeat\.ai/i.test(href) || explicitEvent === "outbound_seeds") {
      return {
        event: "outbound_seeds",
        placement: explicitPlacement || seedsPlacement(anchor, href),
        dest: destOf(href),
      };
    }

    // 下载：GitHub release 资产或站内 /downloads/ 包，按 data-os/data-arch 归因
    if (isDownloadLink(anchor, href)) {
      // 技能包（aibeat-skill.zip / promptbeat-skills.zip）单独计入 download_skill，区分当前/旧版
      if (/skill/i.test(href)) {
        return {
          event: "download_skill",
          placement: explicitPlacement || (anchor.closest(".aibeat-home-skills-overview") ? "skills_overview" : "other"),
          variant: /promptbeat-skills/i.test(href) ? "legacy" : "current",
        };
      }
      const product = downloadProduct(anchor, href);
      if (product) {
        return {
          event: product === "agentbeat" ? "download_agentbeat" : "download_promptbeat",
          placement: explicitPlacement || (anchor.dataset.os ? "platform_menu" : "hero"),
          os: anchor.dataset.os || "",
          arch: anchor.dataset.arch || "",
        };
      }
    }

    // GitHub 外链：release 下载已在上面拦截；release notes(/releases/tag/) 归为 placement=release_notes
    if (/(^|\/\/)(www\.)?github\.com\//i.test(href) || explicitEvent === "outbound_github") {
      if (/\/releases\/tag\//i.test(href)) {
        return { event: "outbound_github", placement: explicitPlacement || "release_notes" };
      }
      return { event: "outbound_github", placement: explicitPlacement || githubPlacement(anchor) };
    }

    // X（原 Twitter）：x.com / twitter.com 主页或推文
    if (/(^|\/\/)(www\.)?(x|twitter)\.com\//i.test(href) || explicitEvent === "outbound_x") {
      return { event: "outbound_x", placement: explicitPlacement || socialPlacement(anchor) };
    }

    // 激励条旁的「活动参与示例」：站内跳 /try，单独计数看激励条带来多少试用（首页顶部为 top_incentive）
    if (anchor.closest(".aibeat-home-seeds-recruitment-try") || explicitEvent === "try_open") {
      return { event: "try_open", placement: explicitPlacement || (anchor.closest(".aibeat-home-top-incentive") ? "top_incentive" : "seeds_incentive") };
    }

    return null;
  }

  // ---- placement 推断辅助：用 DOM 上下文，不依赖 Mintlify 不稳定类名时退回 other ----
  function inNav(el) {
    return !!el.closest(".aibeat-home-nav, .aibeat-home-mobile-utility, .aibeat-home-social, nav");
  }
  function inFooter(el) {
    return !!el.closest("footer, #footer, [class*='footer']");
  }

  function discordPlacement(anchor) {
    if (anchor.closest(".aibeat-home-top-incentive")) return "top_incentive";
    if (anchor.closest(".aibeat-try-incentive")) return "try_incentive";
    if (anchor.closest(".aibeat-home-seeds-recruitment")) return "seeds_cta";
    if (anchor.closest(".aibeat-home-seeds-btn-secondary")) return "seeds_secondary";
    if (anchor.closest(".aibeat-home-social")) return "nav_social";
    if (anchor.closest(".aibeat-home-contact-pills")) return "contact_pills";
    if (inFooter(anchor)) return "footer";
    return "other";
  }

  function seedsPlacement(anchor, href) {
    if (/\/submit(\/|$)/i.test(href) || anchor.closest(".aibeat-home-seeds-btn-primary")) return "seeds_submit";
    if (inNav(anchor)) return "navbar";
    if (anchor.closest(".aibeat-home-seeds")) return "seeds_browse";
    return "other";
  }

  function socialPlacement(anchor) {
    if (anchor.closest(".aibeat-home-social")) return "nav_social";
    if (anchor.closest(".aibeat-home-contact-pills")) return "contact_pills";
    if (inFooter(anchor)) return "footer";
    return "other";
  }

  function githubPlacement(anchor) {
    if (anchor.closest(".aibeat-home-social")) return "nav_social";
    if (anchor.closest(".aibeat-home-contact-pills")) return "contact_pills";
    if (inFooter(anchor)) return "footer";
    return "other";
  }

  function isDownloadLink(anchor, href) {
    if (anchor.dataset.os || anchor.dataset.arch) return true;
    return /\/releases\/download\//i.test(href) || /^\/downloads\//.test(href) || /\.(tar\.gz|zip|dmg|exe)(\?|$)/i.test(href);
  }

  function downloadProduct(anchor, href) {
    const carrier = anchor.closest("[data-product]");
    if (carrier && carrier.dataset.product) return carrier.dataset.product;
    if (/agentbeat/i.test(href)) return "agentbeat";
    if (/promptbeat/i.test(href)) return "promptbeat";
    return null; // 技能包等非产品下载暂不计入 download_* 字典
  }

  // ---- 委托监听：capture 阶段，SPA 导航后依旧有效，无需重复绑定 ----
  function onClick(e) {
    const anchor = e.target && e.target.closest && e.target.closest("a[href]");
    if (!anchor) return;
    const hit = classify(anchor);
    if (!hit) return;
    const { event, placement, ...rest } = hit;
    report(event, Object.assign({ placement: normPlacement(event, placement) }, rest));
  }

  // ---- WeCom：无跳转 URL 的 UI 事件，监听 popover 触发按钮 ----
  function onWecom(e) {
    const btn = e.target && e.target.closest && e.target.closest(".aibeat-home-wecom-btn");
    if (!btn) return;
    const placement = btn.closest(".aibeat-home-wecom-wrapper--mobile") ? "nav_mobile" : "nav_desktop";
    report("wecom_open", { placement: normPlacement("wecom_open", placement) });
  }

  // ---- 试用页活动海报：try-incentive.js 在浮窗停留 0.6s（悬停/键盘）或手机端海报露出 1s 后派发，每次打开页面一次 ----
  const POSTER_METHODS = ["hover", "focus", "inline"];
  function onPosterView(e) {
    const raw = e.detail && e.detail.method;
    report("poster_view", {
      placement: normPlacement("poster_view", "try_incentive"),
      method: POSTER_METHODS.includes(raw) ? raw : "other",
    });
  }

  document.addEventListener("click", onClick, true);
  document.addEventListener("click", onWecom, true);
  document.addEventListener("aibeat:poster-view", onPosterView);
})();
