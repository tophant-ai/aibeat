// Real Chrome homepage, navigation, theme and download-selector regression.
// Injected platform cases exercise browser logic, not native OS binary execution.
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
const BASE = process.env.QA_BASE_URL || 'http://127.0.0.1:39002';
const OUT = process.env.HOME_QA_DIR || '/data/mhc/.work/2026-09-08-aibeat-onboarding-home/browser';
fs.mkdirSync(OUT, { recursive: true });
const failures=[], results=[];
const check=(name,ok,detail)=>{if(!ok) failures.push({name,detail});};
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
const browser=await puppeteer.launch({headless:true,userDataDir:path.join(OUT,'profile'),executablePath:process.env.PUPPETEER_EXECUTABLE_PATH,args:['--no-sandbox','--disable-setuid-sandbox','--disable-background-networking']});
const ready=async p=>{await p.waitForSelector('.aibeat-home[data-downloads-ready="true"]');await wait(180);};
try {
 for(const lang of ['en','cn']) for(const theme of ['light','dark']) for(const width of [320,390,768,1024,1440]) {
  const name=`${lang}-${theme}-${width}`,prefix=lang==='cn'?'/cn':'';
  const p=await browser.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.setViewport({width,height:1000});
  await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await p.evaluateOnNewDocument(t=>{localStorage.setItem('theme',t);localStorage.setItem('isDarkMode',String(t==='dark'));},theme);
  await p.goto(BASE+(prefix||'/'),{waitUntil:'networkidle2'});await ready(p);
  const audit=await p.evaluate(()=>{
   const home=document.querySelector('.aibeat-home');
   const visible=n=>{const d=n.closest('details:not([open])');return (!d||!!n.closest('summary'))&&n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&getComputedStyle(n).clipPath==='none';};
   const nodes=[...home.querySelectorAll('a,button,summary,h1,h2,h3,p')].filter(visible);
   const clipped=nodes.filter(n=>{const r=n.getBoundingClientRect();return r.left < -1||r.right>innerWidth+1;}).map(n=>n.className+':'+n.textContent.trim().slice(0,45));
   const small=nodes.filter(n=>n.matches('a,button,summary')&&n.getBoundingClientRect().height<43.5).map(n=>n.className+':'+n.textContent.trim());
   const header=home.querySelector('.aibeat-home-nav').getBoundingClientRect();
   const socialRects=[...home.querySelectorAll('.aibeat-home-nav .aibeat-home-social a')].map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};});
   const socialSingleRow=socialRects.length===4&&socialRects.every((r,i)=>Math.abs(r.y-socialRects[0].y)<1&&(!i||r.x>=socialRects[i-1].x+socialRects[i-1].width-1));
   const productNames=[...home.querySelectorAll('.aibeat-home-products-grid .aibeat-home-product-name')].map(n=>n.textContent.trim());
   const routerCard=home.querySelector('.aibeat-home-product-card--router');
   const routerMainLink=routerCard?.querySelector('.aibeat-home-router-cta')?.getAttribute('href');
   const routerMetaLinks=[...(routerCard?.querySelectorAll('.aibeat-home-download-meta a')||[])].map(a=>a.getAttribute('href'));
   const routerIcon=routerCard?.querySelector('.aibeat-home-product-logo')?.getAttribute('src');
   const routerCardText=routerCard?.textContent||'';
   const modelNotice=home.querySelector('.aibeat-home-model-notice');
   const modelNoticeTitle=modelNotice?.querySelector('.aibeat-home-model-notice-title')?.textContent.trim()||'';
   const modelNoticeRoles=modelNotice?.querySelector('.aibeat-home-model-notice-roles')?.textContent.trim()||'';
   const popoverEl=home.querySelector('#aibeat-wecom-popover');
   const popoverQr=popoverEl?.querySelector('.aibeat-home-wecom-popover-qr');
   const popoverLink=popoverEl?.querySelector('.aibeat-home-wecom-fallback-link')?.getAttribute('href');
   const popoverAttr=popoverEl?.getAttribute('popover');
   const desktopWecomBtn=home.querySelector('.aibeat-home-wecom-wrapper--desktop .aibeat-home-wecom-btn');
   const mobileWecomBtn=home.querySelector('.aibeat-home-wecom-wrapper--mobile .aibeat-home-wecom-btn');
   const wecomTarget=desktopWecomBtn?.getAttribute('popovertarget')||mobileWecomBtn?.getAttribute('popovertarget');
   const qrImg=home.querySelector('.aibeat-home-contact img[src="/images/aibeat-wecom-contact.png"]');
   const qrLink=home.querySelector('.aibeat-home-contact-qr-link');
   const contactKickerEl=home.querySelector('.aibeat-home-contact-kicker');
   const contactKicker=contactKickerEl?.textContent.trim()||'';
   const contactKickerWeight=contactKickerEl?getComputedStyle(contactKickerEl).fontWeight:'';
   const contactBtnRemoved=!home.querySelector('.aibeat-home-contact-btn');
   const contactQrLink=!!home.querySelector('.aibeat-home-contact-qr-link[href="/images/aibeat-wecom-contact.png"]');
   const contactPills=[...home.querySelectorAll('.aibeat-home-contact-pills a')].map(n=>n.getAttribute('href'));
   const redditEl=home.querySelector('.aibeat-home-nav .aibeat-home-social a[href*="reddit.com"]');
   const discordEl=home.querySelector('.aibeat-home-nav .aibeat-home-social a[href*="discord.gg"]');
   const socialIconsBrand={
     reddit:redditEl?getComputedStyle(redditEl).color:'',
     discord:discordEl?getComputedStyle(discordEl).color:'',
   };
   const kicker=home.querySelector('.aibeat-home-hero-copy .aibeat-home-kicker')?.textContent.trim()||'';
   const desktopCards=[...home.querySelectorAll('.aibeat-home-product-card')].map(c=>{
     const r=c.getBoundingClientRect();
     const cta=c.querySelector('.aibeat-home-button')?.getBoundingClientRect();
     const meta=c.querySelector('.aibeat-home-download-meta')?.getBoundingClientRect();
     return {top:r.top,bottom:r.bottom,height:r.height,cta:cta?{top:cta.top,bottom:cta.bottom,height:cta.height}:null,meta:meta?{top:meta.top,bottom:meta.bottom}:null};
   });
   const noticeStyle=modelNotice?{
     bg:getComputedStyle(modelNotice).backgroundColor,
     borderLeft:getComputedStyle(modelNotice).borderLeftColor,
   }:null;
   const storyImages=[...home.querySelectorAll('.aibeat-home-skills-example .aibeat-home-evidence-img')].map(img=>({src:img.getAttribute('src'),naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,complete:img.complete}));
   const storyLinks=[...home.querySelectorAll('.aibeat-home-skills-example .aibeat-home-image-link')].map(a=>({href:a.getAttribute('href'),target:a.getAttribute('target'),height:a.getBoundingClientRect().height,visible:a.getBoundingClientRect().height>0}));
   const suggestions=home.querySelectorAll('.aibeat-home-skills-suggestions .aibeat-home-suggestion-item').length;
   const pipelineSteps=home.querySelectorAll('.aibeat-home-step-pipeline .aibeat-home-pipeline-step').length;
   return {contactPills,sections:[...home.querySelectorAll(':scope > section')].map(n=>n.getAttribute('aria-labelledby')),h1:home.querySelectorAll('h1').length,kicker,desktopCards,noticeStyle,productNames,routerMainLink,routerMetaLinks,routerIcon,routerNotOpenSource:!routerCardText.includes('开源')&&!routerCardText.includes('Open-source'),modelNoticeTitle,modelNoticeRoles,popoverAttr,popoverTarget:wecomTarget,popoverLink,popoverQrSrc:popoverQr?.getAttribute('src'),popoverQrNatural:popoverQr?popoverQr.naturalWidth===462&&popoverQr.naturalHeight===450:false,points:home.querySelectorAll('.aibeat-home-point-item').length,clipped,small,overflow:document.documentElement.scrollWidth>innerWidth+1,theme:document.documentElement.classList.contains('dark')?'dark':'light',lang:document.documentElement.lang,headerTop:header.top,headerHeight:header.height,socialSingleRow,socialRects,social:home.querySelectorAll('.aibeat-home-nav .aibeat-home-social a').length,visibleSocial:[...home.querySelectorAll('.aibeat-home-social a')].filter(visible).length,socialIconsBrand,oldCards:home.querySelectorAll('.aibeat-home-entry').length,skills:home.querySelectorAll('.aibeat-home-skills-example').length,seed:!!home.querySelector('.aibeat-home-seeds a[href="https://seeds.aibeat.ai"]'),zip:!!home.querySelector('.aibeat-home-skills-overview a[href="/downloads/aibeat-skill.zip"]'),legacyZip:!!home.querySelector('.aibeat-home-skills-overview a[href="/downloads/promptbeat-skills.zip"]'),pb:[...home.querySelectorAll('.aibeat-home-os-btn')].map(n=>n.getAttribute('href')),ab:[...home.querySelectorAll('.aibeat-home-platform-link')].map(n=>n.getAttribute('href')),guideLinks:[...home.querySelectorAll('.aibeat-home-download-meta a[href$="/quickstart"]')].map(n=>n.getAttribute('href')),contactLink:!!home.querySelector('.aibeat-home-contact a[href="/images/aibeat-wecom-contact.png"]'),contactQr:!!qrImg,qrNatural:qrImg?qrImg.naturalWidth===462&&qrImg.naturalHeight===450:false,qrBackground:qrLink?getComputedStyle(qrLink).backgroundColor:'',contactCopy:home.querySelector('.aibeat-home-contact-desc')?.textContent.trim()||'',contactKicker,contactKickerWeight,contactBtnRemoved,contactQrLink,skillsDisclaimers:[...home.querySelectorAll('.aibeat-home-example-disclaimer')].map(n=>n.textContent.trim()),storyImages,storyLinks,suggestions,pipelineSteps};
  });
  check(name+':sections',JSON.stringify(audit.sections)===JSON.stringify(['aibeat-home-title','skills-faststart-title','seeds-community-title'])&&audit.h1===1,audit.sections);
  check(name+':kicker',audit.kicker==='AIBEAT Series',audit.kicker);
  check(name+':geometry',!audit.overflow&&!audit.clipped.length&&!audit.small.length,audit);
  check(name+':theme/locale',audit.theme===theme&&(lang==='cn'?audit.lang.startsWith('zh'):audit.lang==='en'),audit);
  check(name+':products',JSON.stringify(audit.productNames)===JSON.stringify(['PromptBeat','AgentBeat','RouterBeat'])&&audit.points===9&&audit.oldCards===0,audit.productNames);
  check(name+':routerbeat',audit.routerMainLink==='https://www.sairouter.com/secureboard/platforms?dimension=overall'&&JSON.stringify(audit.routerMetaLinks)===JSON.stringify(['https://www.sairouter.com/secureboard','https://www.sairouter.com/secureboard/platforms?dimension=overall'])&&audit.routerIcon==='/images/routerbeat-icon.png'&&audit.routerNotOpenSource,audit);
  check(name+':model-notice',audit.modelNoticeTitle===(lang==='cn'?'开始前：选择适合任务的模型':'Before you start: choose a suitable model')&&audit.modelNoticeRoles.includes(lang==='cn'?'驱动 Skill 的编码助手/Harness 模型':'coding assistant or Harness model'),audit);
  check(name+':model-notice-red',audit.noticeStyle&&((theme==='dark'&&(audit.noticeStyle.borderLeft.includes('239')||audit.noticeStyle.borderLeft==='rgb(239, 68, 68)'))||(theme==='light'&&audit.noticeStyle.borderLeft==='rgb(220, 38, 38)')),audit.noticeStyle);
  if(width>=1024){
    const dc=audit.desktopCards;
    const cardTopAlign=dc.every(c=>Math.abs(c.top-dc[0].top)<1.5);
    const cardBottomAlign=dc.every(c=>Math.abs(c.bottom-dc[0].bottom)<1.5);
    const ctaBottomAlign=dc.every(c=>Math.abs(c.cta.bottom-dc[0].cta.bottom)<1.5);
    const ctaHeightValid=dc.every(c=>c.cta.height>=43.5&&c.cta.height<=56.5);
    check(name+':desktop-cards-aligned',cardTopAlign&&cardBottomAlign&&ctaBottomAlign&&ctaHeightValid,{
      cardTops:dc.map(c=>c.top),
      cardBottoms:dc.map(c=>c.bottom),
      ctaBottoms:dc.map(c=>c.cta.bottom),
      ctaHeights:dc.map(c=>c.cta.height),
    });
  }
  check(name+':wecom-popover',audit.popoverTarget==='aibeat-wecom-popover'&&audit.popoverAttr==='auto'&&audit.popoverLink==='#contact'&&audit.popoverQrSrc==='/images/aibeat-wecom-contact.png'&&audit.popoverQrNatural,audit);
  check(name+':header',Math.abs(audit.headerTop)<2&&audit.social===4&&audit.visibleSocial===4,audit);
  check(name+':header-single-row',audit.socialSingleRow&&audit.headerHeight<70,{height:audit.headerHeight,social:audit.socialRects});
  check(name+':social-brands',audit.socialIconsBrand.reddit==='rgb(255, 69, 0)'&&audit.socialIconsBrand.discord==='rgb(88, 101, 242)',audit.socialIconsBrand);
  check(name+':skills/seeds',audit.skills===2&&audit.zip&&audit.legacyZip&&audit.seed,audit);
  check(name+':story-images',audit.storyImages.length===8&&audit.storyImages.every(i=>i.src.startsWith('/images/story-')&&i.naturalWidth===1280&&i.naturalHeight===960),audit.storyImages);
  const visibleLinks=audit.storyLinks.filter(l=>l.visible);
  check(name+':story-links',audit.storyLinks.length===8&&audit.storyLinks.every(l=>l.target==='_blank')&&visibleLinks.length===2&&visibleLinks.every(l=>l.height>=43.5),audit.storyLinks);
  await p.click('.aibeat-home-skills-modes a[href="#skills-all-steps"]');
  await wait(50);
  const allLinksHeight=await p.$$eval('.aibeat-home-skills-example .aibeat-home-image-link',links=>links.map(l=>l.getBoundingClientRect().height));
  check(name+':all-mode-links',allLinksHeight.length===8&&allLinksHeight.every(h=>h>=43.5),allLinksHeight);
  await p.click('.aibeat-home-step-pipeline a[href="#story-b-step-1"]');
  await wait(50);
  check(name+':story-steps',audit.pipelineSteps===8&&audit.suggestions===4,{steps:audit.pipelineSteps,suggestions:audit.suggestions});
  const expectedDisclaimer=lang==='cn'?'你可以这样问':'Try asking';
  check(name+':disclaimers',audit.skillsDisclaimers.length===2&&audit.skillsDisclaimers.every(d=>d===expectedDisclaimer),audit.skillsDisclaimers);
  const expectedCopy=lang==='cn'?'扫码添加官方助手小星星，回复 AIBEAT 加入交流群。':'Scan to add our official assistant, Xiaoxingxing. Send AIBEAT to join the community chat.';
  check(name+':contact-pills',JSON.stringify(audit.contactPills)===JSON.stringify(['https://x.com/Tophant001','https://discord.gg/NXXz8JG74','https://github.com/tophant-ai/aibeat']),audit.contactPills);
  check(name+':contact',audit.contactLink&&audit.contactQr&&audit.qrNatural&&audit.qrBackground==='rgb(255, 255, 255)'&&audit.contactCopy===expectedCopy&&audit.contactBtnRemoved&&audit.contactQrLink,audit);
  check(name+':contact-kicker',audit.contactKicker===(lang==='cn'?'社区交流':'Community')&&(audit.contactKickerWeight==='800'||Number(audit.contactKickerWeight)>=700),{kicker:audit.contactKicker,weight:audit.contactKickerWeight});
  check(name+':download-links',new Set(audit.pb).size===4&&audit.pb.every(u=>u.startsWith('https://github.com/tophant-ai/aibeat/releases/download/v0.2/'))&&new Set(audit.ab).size===4&&audit.ab.every(u=>u.startsWith('/downloads/agentbeat-0.2-eval-preview.1-')),audit);
  check(name+':guides',JSON.stringify(audit.guideLinks)===JSON.stringify([prefix+'/promptbeat/quickstart',prefix+'/agentbeat/quickstart']),audit.guideLinks);
  await p.screenshot({path:path.join(OUT,name+'-hero.png')});
  const nav=width<1024?'.aibeat-home-mobile-links':'.aibeat-home-nav-links';
  for(const id of ['skills','seeds']){
   await p.click(`${nav} a[href="#${id}"]`);await wait(100);
   const geometry=await p.evaluate(id=>{const nav=document.querySelector('.aibeat-home-nav').getBoundingClientRect(),utility=document.querySelector('.aibeat-home-mobile-utility').getBoundingClientRect();return {top:document.getElementById(id).getBoundingClientRect().top,headerTop:nav.top,bottom:Math.max(nav.bottom,utility.bottom)};},id);
   check(name+':sticky-'+id,Math.abs(geometry.headerTop)<2&&geometry.top>=geometry.bottom-2,geometry);
   if(width===390||width===1440)await p.screenshot({path:path.join(OUT,name+'-'+id+'.png')});
  }
  await p.evaluate(()=>scrollTo(0,0));
  if(width===390||width===1440)await p.screenshot({path:path.join(OUT,name+'-full.png'),fullPage:true});
  const group=width<1024?'.aibeat-home-mobile-language':'.aibeat-home-nav-language';
  await p.click(`${group} a[href="${lang==='cn'?'/':'/cn'}"]`);
  await p.waitForFunction(target=>location.pathname===target,{},lang==='cn'?'/':'/cn');await ready(p);
  check(name+':language-click',new URL(p.url()).pathname===(lang==='cn'?'/':'/cn'),p.url());
  check(name+':errors',!errors.length,errors);results.push({name,audit,errors});await p.close();
 }
 // Clean first visit defaults to light even when the OS prefers dark; choice persists.
 const p=await browser.newPage();await p.setViewport({width:390,height:1000});
 await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:'dark'},{name:'prefers-reduced-motion',value:'reduce'}]);
 await p.goto(BASE+'/cn',{waitUntil:'networkidle2'});await p.evaluate(()=>localStorage.clear());await p.reload({waitUntil:'networkidle2'});await ready(p);
 check('default-light',await p.evaluate(()=>document.documentElement.classList.contains('light')));
 await p.click('.aibeat-home-theme-toggle');await wait(150);
 check('toggle-dark',await p.evaluate(()=>document.documentElement.classList.contains('dark')&&localStorage.getItem('theme')==='dark'));
 await p.reload({waitUntil:'networkidle2'});await ready(p);
 check('theme-persist-reload',await p.evaluate(()=>document.documentElement.classList.contains('dark')));
 await p.click('.aibeat-home-mobile-links a[href="/cn/about/overview"]');await p.waitForFunction(()=>location.pathname==='/cn/about/overview');await wait(300);
 check('theme-persist-doc',await p.evaluate(()=>document.documentElement.classList.contains('dark')));
 await p.close();results.push({name:'default-and-persistent-theme'});
 // Same real page, with synthetic device capabilities, to test safe recommendations.
 const cases=[
  {name:'linux64',ua:'Mozilla/5.0 (X11; Linux x86_64)',platform:'Linux',arch:'x86',bits:'64',key:'linux-x64'},
  {name:'windows64',ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',platform:'Windows',key:'windows-x64'},
  {name:'mac-unknown',ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',platform:'MacIntel',key:null},
  {name:'mac-arm',ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',platform:'macOS',arch:'arm',bits:'64',key:'darwin-arm64'},
  {name:'mac-x64',ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',platform:'macOS',arch:'x86',bits:'64',key:'darwin-x64'},
  {name:'linux-arm',ua:'Mozilla/5.0 (X11; Linux aarch64)',platform:'Linux',arch:'arm',bits:'64',key:null},
  {name:'windows-arm',ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',platform:'Windows',arch:'arm',bits:'64',key:null},
  {name:'x86-32',ua:'Mozilla/5.0 (X11; Linux i686)',platform:'Linux',arch:'x86',bits:'32',key:null},
  {name:'iphone',ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',platform:'iPhone',key:null},
  {name:'unknown',ua:'Unknown',platform:'Unknown',key:null},
 ];
 for(const c of cases){
  const p=await browser.newPage();await p.setViewport({width:1440,height:1000});
  await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await p.evaluateOnNewDocument(c=>{
   Object.defineProperty(navigator,'userAgent',{get:()=>c.ua});Object.defineProperty(navigator,'platform',{get:()=>c.platform});
   Object.defineProperty(navigator,'userAgentData',{get:()=>c.arch?{platform:c.platform,getHighEntropyValues:async()=>({architecture:c.arch,bitness:c.bits})}:undefined});
   const original=window.matchMedia.bind(window);window.matchMedia=q=>q==='(pointer: fine)'?{matches:true,media:q}:original(q);
  },c);
  await p.goto(BASE+'/',{waitUntil:'networkidle2'});await ready(p);
  const audit=await p.$$eval('.aibeat-home-download-main',nodes=>nodes.map(n=>({href:n.getAttribute('href'),label:n.textContent.trim()})));
  check(c.name+':recommendation',c.key?audit.every(n=>n.href.includes(c.key)):audit.every(n=>n.href.endsWith('/quickstart')),audit);
  if(!c.key){await p.click('.aibeat-home-download-main[data-product="promptbeat"]');await wait(180);check(c.name+':chooser-not-immediately-closed',await p.$eval('.aibeat-home-platform-selector[data-product="promptbeat"]',n=>n.dataset.open==='true'));}
  const selector='.aibeat-home-platform-selector[data-product="promptbeat"]';
  await p.hover(selector);await wait(120);check(c.name+':hover',await p.$eval(selector,n=>n.dataset.open==='true'));
  await p.$eval(selector+' button',n=>n.focus());await p.keyboard.press('Escape');
  check(c.name+':escape',await p.$eval(selector,n=>n.dataset.open==='false'&&n.querySelector('button')===document.activeElement));
  await p.keyboard.press('Enter');check(c.name+':keyboard-open',await p.$eval(selector,n=>n.dataset.open==='true'));
  const menu=await p.$eval(selector+' .aibeat-home-platform-menu',n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth};});
  check(c.name+':menu-fit',menu.left>=0&&menu.right<=menu.width,menu);
  await p.click('.aibeat-home-hero h1');check(c.name+':outside-close',await p.$eval(selector,n=>n.dataset.open==='false'));

  // WeCom desktop interaction test (hover preview, native popover, escape, outside click, enter key)
  if(c.name==='linux64'){
    const wecomWrapper='.aibeat-home-wecom-wrapper--desktop';
    const wecomHoverCard='.aibeat-home-wecom-wrapper--desktop .aibeat-home-wecom-hover-card';
    const wecomBtn='.aibeat-home-wecom-wrapper--desktop button';
    const popover='#aibeat-wecom-popover';

    await p.hover(wecomWrapper);await wait(120);
    check('wecom:hover-preview-visible',await p.$eval(wecomHoverCard,n=>getComputedStyle(n).display==='block'));
    await p.hover('.aibeat-home-hero h1');await wait(120);
    check('wecom:hover-preview-hidden',await p.$eval(wecomHoverCard,n=>getComputedStyle(n).display==='none'));

    await p.click(wecomBtn);await wait(120);
    check('wecom:click-open',await p.$eval(popover,n=>n.matches(':popover-open')));
    await p.keyboard.press('Escape');await wait(120);
    check('wecom:escape-close',await p.$eval(popover,n=>!n.matches(':popover-open')));
    check('wecom:escape-focus-returned',await p.evaluate(()=>document.activeElement?.classList.contains('aibeat-home-wecom-btn')));
    check('wecom:escape-hover-card-suppressed',await p.$eval(wecomHoverCard,n=>getComputedStyle(n).display==='none'));

    await p.click(wecomBtn);await wait(120);
    await p.click('.aibeat-home-hero h1');await wait(120);
    check('wecom:outside-close',await p.$eval(popover,n=>!n.matches(':popover-open')));

    await p.$eval(wecomBtn,n=>n.focus());
    await p.keyboard.press('Enter');await wait(120);
    check('wecom:enter-open',await p.$eval(popover,n=>n.matches(':popover-open')));
    await p.keyboard.press('Escape');await wait(120);
  }
  results.push({name:c.name,audit});await p.close();
 }
 const touch=await browser.newPage();await touch.setViewport({width:320,height:1000,isMobile:true,hasTouch:true});
 await touch.goto(BASE+'/cn',{waitUntil:'networkidle2'});await ready(touch);
 for(const product of ['promptbeat','agentbeat']){
  const s=`.aibeat-home-platform-selector[data-product="${product}"]`;
  await touch.tap(s+' button');
  check('touch-'+product,await touch.$eval(s,n=>n.dataset.open==='true'&&n.querySelector('button').getAttribute('aria-expanded')==='true'));
  const fit=await touch.$eval(s+' .aibeat-home-platform-menu',n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;});
  check('touch-fit-'+product,fit);
  await touch.tap(s+' button');
  check('touch-close-'+product,await touch.$eval(s,n=>n.dataset.open==='false'));
 }
 // WeCom mobile touch test
 await touch.tap('.aibeat-home-wecom-wrapper--mobile button');await wait(120);
 check('touch-wecom-open',await touch.$eval('#aibeat-wecom-popover',n=>n.matches(':popover-open')));
 await touch.tap('.aibeat-home-wecom-close-btn');await wait(120);
 check('touch-wecom-close-btn',await touch.$eval('#aibeat-wecom-popover',n=>!n.matches(':popover-open')));
 await touch.tap('.aibeat-home-wecom-wrapper--mobile button');await wait(120);
 await touch.touchscreen.tap(10,10);await wait(120);
 check('touch-wecom-outside-dismiss',await touch.$eval('#aibeat-wecom-popover',n=>!n.matches(':popover-open')));
 await touch.close();results.push({name:'touch-platforms'});
 // No-JS fallback shows the actual platform links, not an inert hidden menu.
 const n=await browser.newPage();await n.setJavaScriptEnabled(false);await n.setViewport({width:390,height:1000,isMobile:true,hasTouch:true});
 await n.goto(BASE+'/cn',{waitUntil:'networkidle2'});
 check('no-js-platform-links',await n.$$eval('.aibeat-home-os-btn',nodes=>nodes.length===4&&nodes.every(n=>n.getBoundingClientRect().width>0)));
 const ng=await n.$eval('.aibeat-home-platform-selector[data-product="promptbeat"] .aibeat-home-platform-menu',n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth};});
 check('no-js-platform-fit',ng.left>=0&&ng.right<=ng.width,ng);
 check('no-js-content',await n.$$eval('.aibeat-home > section',nodes=>nodes.length===3));
 check('no-js-wecom-target',await n.$eval('.aibeat-home-wecom-btn',b=>b.getAttribute('popovertarget')==='aibeat-wecom-popover'));
 check('no-js-wecom-fallback',await n.$eval('.aibeat-home-wecom-fallback-link',a=>a.getAttribute('href')==='#contact'));
 check('no-js-story-images',await n.$$eval('.aibeat-home-skills-example .aibeat-home-evidence-img',nodes=>nodes.length===8));
 await n.screenshot({path:path.join(OUT,'no-js.png')});results.push({name:'no-js'});await n.close();
} catch(error) {failures.push({name:'runtime',detail:error.stack});} finally {await browser.close();}
fs.writeFileSync(path.join(OUT,'qa-report.json'),JSON.stringify({baseUrl:BASE,states:results.length,results,failures},null,2));
console.log(JSON.stringify({baseUrl:BASE,states:results.length,failures},null,2));
if(failures.length)process.exitCode=1;
