/* @ds-bundle: {"format":4,"namespace":"MapCrew","components":[{"name":"LandingMobile"},{"name":"LandingDesktop"},{"name":"LandingDesktopLower"},{"name":"AppApply"},{"name":"AppAcademy"},{"name":"AppPayoutSetup"},{"name":"AppMissions"},{"name":"AppMissionDetail"},{"name":"AppVisitChecklist"},{"name":"AppMissionTracker"},{"name":"AppEarnings"},{"name":"Button"},{"name":"Input"},{"name":"Stepper"},{"name":"MissionCard"},{"name":"MapPin"},{"name":"PayoutSteps"},{"name":"LevelChip"},{"name":"Badge"},{"name":"Toast"},{"name":"EmptyState"}]} */
(function () {
  "use strict";
  var M = (window.MapCrew = window.MapCrew || {});

  /* ---------- Brand config: swap the working name here, once. ---------- */
  M.brand = {
    name: "MapCrew",
    legal: "[Company legal name], Inc.",
    address: "[Street address], [City], [State] [ZIP]",
    support: "[support@yourdomain.com]",
    independence: "MapCrew is an independent company, not affiliated with Google."
  };
  function B() { return M.brand.name; }

  /* ---------- Pay rules (single source for every screen) ---------- */
  M.pay = { visit: 40, live: 25, customer: 50, levels: { bronze: { name: "Bronze", min: 0, bonus: 0 }, silver: { name: "Silver", min: 5, bonus: 0.10 }, gold: { name: "Gold", min: 15, bonus: 0.20 } } };
  M.usd = function (n, cents) {
    var s = (Math.round(n * 100) / 100).toFixed(cents ? 2 : 0);
    var p = s.split("."); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return "$" + p.join(".");
  };
  /* Example range only: low = visit pay only, high = all three steps paid. */
  M.estimate = function (missions, level) {
    var mult = 1 + (M.pay.levels[level || "bronze"].bonus || 0);
    return { low: missions * M.pay.visit * mult, high: missions * (M.pay.visit + M.pay.live + M.pay.customer) * mult };
  };

  /* ---------- Icons: 24px grid, 1.75 stroke, round caps (original set) ---------- */
  var P = {
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    map: '<path d="M9 4L3.5 6.3v13.5L9 17.5l6 2.5 5.5-2.3V4.2L15 6.5 9 4z"/><path d="M9 4v13.5M15 6.5V20"/>',
    list: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.8" cy="6.5" r=".9"/><circle cx="4.8" cy="12" r=".9"/><circle cx="4.8" cy="17.5" r=".9"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    car: '<path d="M4.5 16.5v-4l2.1-5.1A2 2 0 018.5 6h7a2 2 0 011.9 1.4l2.1 5.1v4"/><path d="M3.5 16.5h17M4.5 12.5h15M6.5 16.5v2.5M17.5 16.5v2.5"/><circle cx="8" cy="14.5" r=".6"/><circle cx="16" cy="14.5" r=".6"/>',
    camera: '<path d="M4 8.5A1.5 1.5 0 015.5 7h2.3l1.5-2h5.4l1.5 2h2.3A1.5 1.5 0 0120 8.5v9a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 17.5z"/><circle cx="12" cy="12.8" r="3.4"/>',
    shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6L12 3z"/><path d="M8.8 12.2l2.2 2.2 4.2-4.4"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8 10.5V8a4 4 0 018 0v2.5M12 14.5v2"/>',
    user: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20c1.2-3.6 4.2-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/>',
    id: '<rect x="3" y="5" width="18" height="14" rx="2.2"/><circle cx="9" cy="10.8" r="2.1"/><path d="M5.8 16c.6-1.5 1.8-2.3 3.2-2.3s2.6.8 3.2 2.3M14.5 10h4M14.5 13.5h3"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.4"/><path d="M11 18.5h2"/>',
    wallet: '<rect x="3.5" y="6" width="17" height="13" rx="2.5"/><path d="M3.5 10h17M15.5 14.5h1.5"/>',
    bank: '<path d="M3.5 9.5L12 4.5l8.5 5M5.5 10.5v7M10 10.5v7M14 10.5v7M18.5 10.5v7M3.5 20h17"/>',
    "arrow-right": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "arrow-left": '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    "chev-right": '<path d="M9.5 6l6 6-6 6"/>',
    "chev-down": '<path d="M6 9.5l6 6 6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    "wifi-off": '<path d="M3.5 3.5l17 17M8.6 16.3a5 5 0 016.8 0M5.2 12.8a9.8 9.8 0 014-2.3M18.8 12.8a10 10 0 00-2.6-1.8M2.3 9.3a14.8 14.8 0 015.2-3M21.7 9.3A14.8 14.8 0 0012.8 5.5"/><circle cx="12" cy="19.5" r=".8"/>',
    "cloud-check": '<path d="M7 18.5a4.5 4.5 0 01-.6-8.96A6 6 0 0117.8 8.7a4 4 0 01-.3 9.8z"/><path d="M9.5 13.5l2 2 3.5-3.6"/>',
    refresh: '<path d="M19.5 10.5A7.8 7.8 0 005.8 7.2L4.5 8.8M4.5 4.5v4.3h4.3M4.5 13.5a7.8 7.8 0 0013.7 3.3l1.3-1.6M19.5 19.5v-4.3h-4.3"/>',
    play: '<path d="M8.5 5.8v12.4a.8.8 0 001.2.7l9.8-6.2a.8.8 0 000-1.4L9.7 5.1a.8.8 0 00-1.2.7z"/>',
    pen: '<path d="M4 20h4L19 9a2.1 2.1 0 00-3-3L5 17z"/><path d="M14 7.5l2.5 2.5"/>',
    users: '<circle cx="9" cy="8.5" r="3.3"/><path d="M3 19.5c.9-3 3.2-4.7 6-4.7s5.1 1.7 6 4.7M16 5.4a3.2 3.2 0 010 6.2M17.5 14.9c1.8.6 3 2.2 3.5 4.6"/>',
    store: '<path d="M4.5 10.5v9h15v-9M3 7l1.6-3h14.8L21 7v.8a2.7 2.7 0 01-5.4 0 2.7 2.7 0 01-5.4 0 2.7 2.7 0 01-5.4 0 2.7 2.7 0 01-1.8-.8z"/><path d="M10 19.5V15h4v4.5"/>',
    help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 014.8.9c0 1.7-2.4 2.2-2.4 3.7"/><circle cx="12" cy="17" r=".8"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".8"/>',
    truck: '<path d="M3 6.5h10.5v9.5H3zM13.5 10h3.8l3.2 3.2V16h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    hammer: '<path d="M13.5 4.5l6 6-2 2-2-2-8 8a1.8 1.8 0 01-2.5-2.5l8-8-1.5-1.5z"/>',
    tree: '<path d="M12 21v-4.5M12 3L6.5 10.5h3L5.5 16.5h13l-4-6h3z"/>',
    roof: '<path d="M3 12L12 4l9 8M5.5 10v10h13V10M10 20v-5h4v5"/>',
    fence: '<path d="M5.5 20V6.5l2-2.5 2 2.5V20M14.5 20V6.5l2-2.5 2 2.5V20M3 10h18M3 15h18"/>',
    brick: '<rect x="3.5" y="5" width="17" height="14" rx="1.5"/><path d="M3.5 9.7h17M3.5 14.3h17M9 5v4.7M15 5v4.7M12 9.7v4.6M6.5 14.3V19M17.5 14.3V19"/>',
    sun: '<circle cx="12" cy="12" r="3.8"/><path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4"/>',
    chat: '<path d="M5 18.5V6.5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H8.5z"/><path d="M8.5 9h7M8.5 12.3h4.5"/>',
    cap: '<path d="M2.5 9L12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v4.5c1.5 1.4 3.4 2.2 5.5 2.2s4-.8 5.5-2.2V11M21.5 9v5"/>',
    video: '<rect x="3" y="6.5" width="12.5" height="11" rx="2"/><path d="M15.5 10.5l5-3v9l-5-3"/>',
    flag: '<path d="M5.5 21V4M5.5 4.5h11.5l-2.3 4 2.3 4H5.5"/>',
    external: '<path d="M14 4h6v6M20 4l-8.5 8.5M18 14v4.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 014 18.5v-11A1.5 1.5 0 015.5 6H10"/>',
    alert: '<path d="M12 4.5l8.5 15h-17z"/><path d="M12 10.5v4"/><circle cx="12" cy="17" r=".8"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.2"/><circle cx="9" cy="9.8" r="1.7"/><path d="M20.5 15.5l-5-5-10.5 9"/>',
    mail: '<rect x="3" y="5.5" width="18" height="13" rx="2.2"/><path d="M3.8 7.2l8.2 6 8.2-6"/>',
    "check-out": '<path d="M13.5 4.5H6.5v15h7M10 12h10M17 9l3 3-3 3"/>',
    "check-in": '<path d="M10.5 4.5h7v15h-7M3.5 12h10M10.5 9l3 3-3 3"/>',
    invite: '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 19.5c1-3.2 3.6-5 6.5-5 1.4 0 2.8.4 3.9 1.2M18 13v6M15 16h6"/>',
    route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h7.5a3 3 0 000-6h-7a3 3 0 010-6H16"/>',
    star4: '<path d="M12 3.5l2 6.5 6.5 2-6.5 2-2 6.5-2-6.5-6.5-2 6.5-2z"/>'
  };
  M.icons = Object.keys(P);
  M.icon = function (name, cls) {
    var body = P[name] || P.info;
    return '<span class="mc-ico ' + (cls || "") + '" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + body + "</svg></span>";
  };
  M.tradeIcon = { concrete: "brick", fencing: "fence", roofing: "roof", tree: "tree", general: "hammer" };

  /* ---------- Pin ---------- */
  var PIN = '<svg viewBox="0 0 34 44" aria-hidden="true"><path class="p-body" d="M17 1.5C8.4 1.5 1.5 8.3 1.5 16.8 1.5 27.9 17 42.5 17 42.5S32.5 27.9 32.5 16.8C32.5 8.3 25.6 1.5 17 1.5z"/><circle class="p-eye" cx="17" cy="16.5" r="5.5"/></svg>';
  M.pinSVG = PIN;
  M.pin = function (o) {
    o = o || {};
    var cls = "mc-pin" + (o.state === "done" ? " mc-pin--done" : o.state === "muted" ? " mc-pin--muted" : "");
    var tag = o.tag ? '<span class="mc-pin__tag' + (o.bonus ? " mc-pin__tag--bonus" : "") + '">' + o.tag + "</span>" : "";
    var pos = o.x != null ? ' style="left:' + o.x + "%;top:" + o.y + '%"' : ' style="position:relative;transform:none"';
    return '<button type="button" class="' + cls + '"' + pos + ' aria-pressed="' + (o.selected ? "true" : "false") + '" aria-label="' + (o.label || "Mission") + '">' + PIN + tag + "</button>";
  };

  /* ---------- Map motif: a neighborhood grid, drawn in % so pins line up ---------- */
  function rng(seed) { var s = seed || 7; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  M.map = function (o) {
    o = o || {};
    var r = rng(o.seed || 11), cols = o.cols || 6, rows = o.rows || 7, gx = o.gap || 2.2, gy = gx * (o.aspect || 1);
    var xs = [0], ys = [0], i, j, s = "";
    for (i = 0; i < cols; i++) xs.push(xs[i] + 0.7 + r() * 0.6);
    for (j = 0; j < rows; j++) ys.push(ys[j] + 0.7 + r() * 0.6);
    var sx = 104 / xs[cols], sy = 104 / ys[rows];
    var park = o.park != null ? o.park : Math.floor(r() * cols * rows);
    for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
      var x0 = xs[i] * sx - 2 + gx / 2, x1 = xs[i + 1] * sx - 2 - gx / 2, y0 = ys[j] * sy - 2 + gy / 2, y1 = ys[j + 1] * sy - 2 - gy / 2;
      var split = r() > 0.55;
      var cls = j * cols + i === park ? "m-park" : "m-block";
      if (split && cls === "m-block") {
        var mid = y0 + (y1 - y0) * (0.4 + r() * 0.2);
        s += '<rect class="m-block" x="' + x0.toFixed(2) + '" y="' + y0.toFixed(2) + '" width="' + (x1 - x0).toFixed(2) + '" height="' + (mid - y0 - gy * 0.25).toFixed(2) + '" rx="1.1"/>';
        s += '<rect class="m-block" x="' + x0.toFixed(2) + '" y="' + (mid + gy * 0.25).toFixed(2) + '" width="' + (x1 - x0).toFixed(2) + '" height="' + (y1 - mid - gy * 0.25).toFixed(2) + '" rx="1.1"/>';
      } else {
        s += '<rect class="' + cls + '" x="' + x0.toFixed(2) + '" y="' + y0.toFixed(2) + '" width="' + (x1 - x0).toFixed(2) + '" height="' + (y1 - y0).toFixed(2) + '" rx="1.4"/>';
      }
    }
    if (o.water !== false) s += '<path class="m-water" d="M-2 ' + (o.waterY || 80) + ' C 14 ' + ((o.waterY || 80) - 6) + ", 30 " + ((o.waterY || 80) + 12) + ", 48 102 L -2 102 Z\"/>";
    s += '<path class="m-street" vector-effect="non-scaling-stroke" stroke-width="' + (o.avenue || 7) + '" d="M-2 ' + (o.diagA || 72) + " L 102 " + (o.diagB || 18) + '"/>';
    var route = "";
    if (o.route) route = '<path class="m-route" vector-effect="non-scaling-stroke" d="' + o.route + '"/>';
    var svg = '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' + s + route + "</svg>";
    var radius = o.radius ? '<span style="position:absolute;z-index:1;left:' + o.you[0] + "%;top:" + o.you[1] + "%;width:" + o.radius + "px;height:" + o.radius + 'px;transform:translate(-50%,-50%);border-radius:50%;background:color-mix(in srgb, var(--signal) 8%, transparent);box-shadow:inset 0 0 0 1.5px var(--signal-text);opacity:.7"></span>' : "";
    var you = o.you ? '<span class="mc-you" style="left:' + o.you[0] + "%;top:" + o.you[1] + '%" role="img" aria-label="You are here"></span>' : "";
    var pins = (o.pins || []).map(M.pin).join("");
    var style = (o.height ? "height:" + o.height + "px;" : "") + (o.style || "");
    return '<div class="mc-map ' + (o.cls || "") + '" style="' + style + '" ' + (o.label ? 'role="group" aria-label="' + o.label + '"' : "") + ">" + svg + radius + you + pins + (o.extra || "") + "</div>";
  };

  /* ---------- Mission card ---------- */
  M.missionCard = function (o) {
    o = o || {};
    var bonus = o.bonus ? '<span class="mc-badge mc-badge--bonus">' + M.icon("flag") + " Bonus +" + M.usd(o.bonus) + "</span>" : "";
    var total = M.pay.visit + M.pay.live + M.pay.customer + (o.bonus || 0);
    return '<button type="button" class="mc-mission ' + (o.cls || "") + '">' +
      '<div class="mc-mission__top"><span class="mc-trade">' + M.icon(M.tradeIcon[o.trade] || "hammer") + "</span>" +
      '<div style="flex:1;min-width:0"><div class="mc-between" style="align-items:flex-start"><div class="mc-mission__title">' + (o.title || "Fence contractor") + "</div>" + bonus + "</div>" +
      '<div class="mc-mission__meta"><span>' + M.icon("pin", "mc-ico--sm") + (o.city || "Naperville, IL") + " · " + (o.dist || "3.2 mi") + "</span><span>" + M.icon("calendar", "mc-ico--sm") + (o.slot || "Tue, Oct 20 · 10–11 AM") + "</span></div></div></div>" +
      '<div class="mc-mission__pay"><span class="mc-mission__split"><b>$40</b> visit + <b>$25</b> live + <b>$50</b> if customer' + (o.bonus ? " + <b>" + M.usd(o.bonus) + "</b> bonus" : "") + "</span>" +
      '<span class="mc-mission__total"><small>up to </small>' + M.usd(total) + "</span></div></button>";
  };

  /* ---------- Phone frame ---------- */
  M.phone = function (inner, o) {
    o = o || {};
    return '<div class="mc mc-phone" data-theme="' + (o.theme || "light") + '" role="group" aria-label="' + (o.label || "App screen") + '">' +
      '<div class="mc-island"></div><div class="mc-status"><span>' + (o.time || "9:41") + '</span><span class="mc-status__r"><s></s><i></i></span></div>' +
      '<div class="mc-screen">' + inner + "</div></div>";
  };
  M.board = function (cols) {
    return '<div class="mc-board">' + cols.map(function (c) {
      return '<div class="mc-board__col"><div class="mc-board__cap"><b>' + c.title + "</b>" + (c.note ? "<span>· " + c.note + "</span>" : "") + "</div>" + M.phone(c.html, c) + "</div>";
    }).join("") + "</div>";
  };
  M.tabbar = function (active) {
    var t = [["missions", "map", "Missions"], ["visits", "calendar", "Visits"], ["earnings", "wallet", "Earnings"], ["profile", "user", "Profile"]];
    return '<nav class="mc-tabbar" aria-label="Main">' + t.map(function (x) {
      return '<button type="button" class="mc-tab"' + (x[0] === active ? ' aria-current="page"' : "") + ">" + M.icon(x[1], "mc-ico--lg") + x[2] + "</button>";
    }).join("") + "</nav>";
  };
  M.logo = function () {
    return '<a class="lp-logo" href="#" aria-label="' + B() + ' home"><svg class="lp-logo__mark" viewBox="0 0 34 44" aria-hidden="true"><path class="p-body" d="M17 1.5C8.4 1.5 1.5 8.3 1.5 16.8 1.5 27.9 17 42.5 17 42.5S32.5 27.9 32.5 16.8C32.5 8.3 25.6 1.5 17 1.5z"/><circle class="p-eye" cx="17" cy="16.5" r="5.5"/></svg><span data-brand>' + B() + "</span></a>";
  };
  M.photo = function (title, desc, style) {
    return '<figure class="mc-photo" style="' + (style || "") + '"><figcaption><b>[Photo] ' + title + "</b>" + desc + "</figcaption></figure>";
  };

  /* =================================================================
     Landing page sections (one markup; layout by container queries)
     ================================================================= */
  var L = {};
  L.nav = function () {
    return '<header class="lp-wrap lp-nav">' + M.logo() +
      '<nav class="lp-navlinks" aria-label="Sections"><a href="#how">How it works</a><a href="#pay">Pay</a><a href="#safety">Safety</a><a href="#faq">FAQ</a></nav>' +
      '<span class="mc-row"><a class="mc-btn mc-btn--ghost lp-nav__cta-d" href="#">Log in</a><a class="mc-btn mc-btn--primary mc-btn--sm lp-nav__cta-m" href="#">Apply</a><a class="mc-btn mc-btn--primary lp-nav__cta-d" href="#">Apply in 5 minutes</a></span></header>';
  };
  L.hero = function () {
    var phoneMap = M.map({ seed: 5, cols: 4, rows: 4, gap: 3.2, you: [30, 70], pins: [{ x: 66, y: 44, selected: true, label: "Fence contractor, 3.2 miles" }, { x: 22, y: 30, label: "Roofing" }], route: "M30 70 L30 56 L66 56 L66 44", diagA: 88, diagB: 30, waterY: 92, avenue: 5 });
    var bigMap = M.map({ seed: 21, cols: 7, rows: 7, label: "Map of missions in a neighborhood", you: [24, 78], radius: 260,
      pins: [{ x: 74, y: 22, tag: "$115" }, { x: 86, y: 54, tag: "Bonus", bonus: true }, { x: 58, y: 40, state: "done", label: "Completed visit" }, { x: 40, y: 18, tag: "$115" }, { x: 92, y: 84, state: "muted", label: "Booked by another agent" }] });
    return '<section class="lp-wrap lp-hero" aria-labelledby="hero-h"><div class="lp-hero__grid"><div>' +
      '<p class="lp-eyebrow">' + M.icon("pin", "mc-ico--sm") + " Field agents · US · 18+</p>" +
      '<h1 id="hero-h">Get paid to put local businesses <em>on the map.</em></h1>' +
      '<p class="lp-hero__sub">Visit contractors near you, help them set up their free Google Business Profile, and earn <b>up to $115 per business</b> — paid every Friday.</p>' +
      '<div class="lp-hero__ctas"><a class="mc-btn mc-btn--primary mc-btn--lg" href="#">Apply in 5 minutes ' + M.icon("arrow-right") + '</a><a class="mc-btn mc-btn--secondary mc-btn--lg" href="#pay">See how pay works</a></div>' +
      '<ul class="lp-facts"><li>' + M.icon("check") + "Paid every Friday</li><li>" + M.icon("check") + "No quotas</li><li>" + M.icon("check") + "Daytime visits</li><li>" + M.icon("check") + "You choose where</li></ul></div>" +
      '<div class="lp-hero__visual">' + bigMap +
      '<div class="lp-hero__phone" aria-hidden="true">' + phoneMap + M.missionCard({ trade: "fencing" }) + '<span class="mc-btn mc-btn--primary mc-btn--block">Accept mission</span></div>' +
      '<div class="lp-hero__floater mc-card" aria-hidden="true" style="box-shadow:var(--shadow-raised)"><div class="overline mc-muted" style="margin-bottom:8px">This business</div>' +
      '<div class="mc-pline" style="margin-bottom:10px"><i data-state="done"></i><i data-state="pending"></i><i></i></div>' +
      '<div class="mc-kv"><div><span class="k">Visit validated</span><span class="v">$40</span></div><div><span class="k">Profile live</span><span class="v">+$25</span></div><div><span class="k">Becomes a customer</span><span class="v">+$50</span></div></div></div>' +
      "</div></div></section>";
  };
  L.how = function () {
    var s = [
      ["Apply and get certified", "Five short video lessons and a quiz — about 45 minutes, online, at your pace.", "About 45 min"],
      ["Pick missions near you", "Every mission shows the trade, distance, time slot and exact pay before you accept. You choose when and where.", "No quotas"],
      ["Visit, help, get paid", "Spend 45–60 minutes with the owner, set up their profile on their own phone, take the photos, check out.", "Paid every Friday"]
    ];
    return '<section class="lp-sec" id="how" aria-labelledby="how-h"><div class="lp-wrap"><p class="lp-eyebrow">How it works</p><h2 class="lp-h2" id="how-h">Three steps. No guesswork.</h2>' +
      '<div class="lp-steps">' + s.map(function (x, i) {
        return '<article class="lp-stepcard"><span class="lp-stepcard__n">' + (i + 1) + "</span><h3>" + x[0] + "</h3><p>" + x[1] + '</p><span class="mc-badge mc-badge--outline lp-stepcard__tag">' + x[2] + "</span></article>";
      }).join("") + "</div></div></section>";
  };
  L.pay = function () {
    var arrow = '<span class="mc-payout__arrow">' + M.icon("arrow-right", "mc-ico--lg") + "</span>";
    return '<section class="lp-sec lp-sec--sunk" id="pay" aria-labelledby="pay-h"><div class="lp-wrap lp-pay__grid"><div>' +
      '<p class="lp-eyebrow">Pay, fully transparent</p><h2 class="lp-h2" id="pay-h">Three payments per business. All on the card.</h2>' +
      '<p class="lp-lede">You see the full breakdown before you accept a mission. Nothing is hidden behind “up to”.</p>' +
      '<div class="lp-payout">' +
      '<div class="lp-pstep"><span class="mc-payout__n">Step 1</span><span class="mc-payout__when">When we validate your visit</span><span class="mc-payout__note">Reviewed by our team after check-out</span><span class="mc-payout__amt">$40</span></div>' + arrow +
      '<div class="lp-pstep"><span class="mc-payout__n">Step 2</span><span class="mc-payout__when">When the profile goes live</span><span class="mc-payout__note">After the owner finishes verification</span><span class="mc-payout__amt">+$25</span></div>' + arrow +
      '<div class="lp-pstep lp-pstep--maybe"><span class="mc-payout__n">Step 3 · if it happens</span><span class="mc-payout__when">If the business becomes our customer</span><span class="mc-payout__note">The owner decides — not guaranteed</span><span class="mc-payout__amt">+$50</span></div></div>' +
      '<div class="lp-levels"><div class="lp-level"><span class="mc-level mc-level--bronze">Bronze</span><b>+0%</b><span>From your first visit</span></div><div class="lp-level"><span class="mc-level mc-level--silver">Silver</span><b>+10%</b><span>After 5 validated visits</span></div><div class="lp-level"><span class="mc-level mc-level--gold">Gold</span><b>+20%</b><span>After 15 validated visits</span></div></div>' +
      '<div class="lp-friday">' + M.icon("calendar") + "<div><b>Paid every Friday via Stripe</b><span>To the bank account or debit card you connect. No fees to join.</span></div></div>" +
      "</div>" + L.estimator() + "</div></section>";
  };
  L.estimator = function () {
    return '<div class="lp-est" data-est><span class="mc-badge mc-badge--pending lp-est__ex">' + M.icon("info") + " Example, not a guarantee</span>" +
      '<h3 class="h3" style="margin-top:8px">What could a month look like?</h3>' +
      '<div class="mc-field" style="margin-top:20px"><label class="mc-label mc-between" for="est-n"><span>Missions per month</span><span class="money mc-num" data-est-n>8</span></label>' +
      '<input class="mc-range" id="est-n" type="range" min="1" max="40" value="8" data-est-range aria-describedby="est-out"></div>' +
      '<div class="mc-field" style="margin-top:16px"><span class="mc-label" id="est-lvl">Your level</span><div class="mc-seg" role="radiogroup" aria-labelledby="est-lvl" data-est-level>' +
      '<button type="button" role="radio" aria-checked="true" data-v="bronze">Bronze</button><button type="button" role="radio" aria-checked="false" data-v="silver">Silver</button><button type="button" role="radio" aria-checked="false" data-v="gold">Gold</button></div></div>' +
      '<div class="lp-est__out" id="est-out" aria-live="polite"><div class="mc-muted body-s">Example range per month</div><div class="lp-est__range" data-est-out>$320 – $920</div>' +
      '<div class="mc-muted body-s" style="margin-top:4px">About <span data-est-hours>8–10</span> hours on site, plus your travel.</div></div>' +
      '<p class="lp-est__fine">Low end: only the $40 visit payment. High end: all three payments for every business. Real results depend on validated visits and what each owner decides. Level bonus applies to all three payments.</p></div>';
  };
  L.visit = function () {
    var t = [["0:00", "Check in", "Tap check-in when you arrive. We confirm with the owner that you're there."], ["0:05", "Owner signs consent", "They read and sign on your phone: what you'll do, what you won't."],
      ["0:10", "Profile set up — on their phone", "The owner signs in to their own Google account. You guide; they type. You never see their password."],
      ["0:30", "Photos", "10–15 shots: logo, truck, team, equipment, past jobs. The app shows what's still missing."],
      ["0:45", "Verification", "If Google offers video verification, you walk the owner through it."], ["0:55", "Done — check out", "Submit your checklist. Your $40 is on its way to validation."]];
    return '<section class="lp-sec" aria-labelledby="visit-h"><div class="lp-wrap lp-visit__grid"><div><p class="lp-eyebrow">What a visit looks like</p><h2 class="lp-h2" id="visit-h">About an hour, start to finish.</h2>' +
      '<p class="lp-lede">The app walks you through every step. Training covers the rest, including what to say.</p>' +
      M.photo("Agent and owner at a fencing workshop", "Daylight, owner holding their own phone, agent pointing at the screen. Casual clothes, early 20s–30s.", "") .replace('class="mc-photo"', 'class="mc-photo lp-visitphoto"') +
      '</div><ol class="lp-timeline">' + t.map(function (x) { return '<li class="lp-tl"><span class="lp-tl__t">' + x[0] + "</span><div><h3>" + x[1] + "</h3><p>" + x[2] + "</p></div></li>"; }).join("") + "</ol></div></section>";
  };
  L.who = function () {
    var p = [["Students", "Fit visits between classes. Pick a mission, go, be back for your 2 PM.", "Agent with a backpack talking with a concrete contractor beside a mixer truck"],
      ["Parents", "Daytime only, during school hours, close to home. No quotas, no minimums.", "Agent and tree-service owner reviewing photos next to a chipper"],
      ["Gig workers", "Pay per mission is fixed and shown up front, with distance. Payouts every Friday.", "Agent photographing a roofing crew's truck in a driveway"]];
    return '<section class="lp-sec lp-sec--sunk" aria-labelledby="who-h"><div class="lp-wrap"><p class="lp-eyebrow">Who it\'s for</p><h2 class="lp-h2" id="who-h">Flexible work for people with a phone and a free morning.</h2>' +
      '<div class="lp-who">' + p.map(function (x) {
        return '<article class="lp-persona">' + M.photo(x[0], x[2]) + '<div class="lp-persona__body"><h3>' + x[0] + "</h3><p>" + x[1] + '</p><p class="lp-quote">[Testimonial placeholder — real agent quote, with permission]</p></div></article>';
      }).join("") + '</div><div class="lp-pills"><span class="mc-badge mc-badge--outline">No experience needed</span><span class="mc-badge mc-badge--outline">No quotas</span><span class="mc-badge mc-badge--outline">You set your radius</span><span class="mc-badge mc-badge--outline">18+ only</span></div></div></section>';
  };
  L.trust = function () {
    var t = [["store", "Every business said yes first", "Our team calls each contractor and books the visit. You never show up cold."], ["sun", "Daytime appointments", "Visits are scheduled during business hours, at the business."],
      ["id", "Identity-verified agents", "Every agent verifies their ID before their first mission."], ["lock", "You never handle passwords", "The owner signs in on their own phone, to their own account."],
      ["pen", "A clear contractor agreement", "You're an independent contractor. The agreement is short and in plain English."], ["chat", "Real support", "Message a real person from the app during visits. [Support hours placeholder]"]];
    return '<section class="lp-sec lp-sec--forest" id="safety" aria-labelledby="trust-h"><div class="lp-wrap"><p class="lp-eyebrow">Trust and safety</p><h2 class="lp-h2" id="trust-h">Built so you know exactly who you\'re working with.</h2>' +
      '<div class="lp-trust">' + t.map(function (x) { return '<div class="lp-titem"><span class="lp-titem__i">' + M.icon(x[0]) + "</span><div><h3>" + x[1] + "</h3><p>" + x[2] + "</p></div></div>"; }).join("") + "</div>" +
      '<p class="lp-indep">' + M.icon("info") + '<span data-brand-line>' + M.brand.independence + "</span></p>" +
      '<p class="lp-lede" style="margin-top:16px;font-size:15px">Agents are never paid for reviews, and never write or ask for them.</p></div></section>';
  };
  L.faq = function () {
    var q = [["When do I get paid?", "<p>Every Friday, via Stripe, for every payment step validated by [cutoff day and time placeholder]. Money goes to the bank account or debit card you connect.</p><p>Your first payout can take a few extra days while Stripe verifies your details.</p>"],
      ["Do I need a car?", "<p>No. You set a travel radius and tell us whether you have a car; we only show missions you can reach. Some areas will have fewer missions without one.</p>"],
      ["Is this legit?", "<p>Yes, and you can check: " + M.brand.legal + " is a registered US company at " + M.brand.address + ". Every business agreed to the visit before it's offered to you, you're paid for visits — never for reviews — and it costs nothing to join. " + M.brand.independence + "</p>"],
      ["How do taxes work (1099)?", "<p>You're an independent contractor, so we don't withhold taxes. If your earnings pass the IRS reporting threshold, you'll get a 1099-NEC through Stripe early the next year. Setting some money aside helps. This isn't tax advice.</p>"],
      ["What if the owner isn't there?", "<p>Check in on arrival so we know you made it, then tap “Owner not here”. Our team calls the business while you wait. If the visit can't happen: [no-show policy placeholder].</p>"],
      ["Why 18+?", "<p>You'll sign a contractor agreement, get paid through Stripe and visit businesses on your own. All of that requires you to be an adult.</p>"]];
    return '<section class="lp-sec" id="faq" aria-labelledby="faq-h"><div class="lp-wrap lp-faq__grid"><div><p class="lp-eyebrow">FAQ</p><h2 class="lp-h2" id="faq-h">Fair questions.</h2><p class="lp-lede">Still unsure? Write to ' + M.brand.support + " — a person answers.</p></div>" +
      '<div class="lp-faq">' + q.map(function (x, i) { return "<details" + (i < 1 ? " open" : "") + "><summary>" + x[0] + M.icon("plus") + "</summary><div>" + x[1] + "</div></details>"; }).join("") + "</div></div></section>";
  };
  L.footer = function () {
    return '<div class="lp-sec--forest"><div class="lp-wrap"><section class="lp-final" aria-labelledby="final-h"><div><h2 id="final-h">Your neighborhood has businesses that need to be found.</h2><p class="lp-final__fine">18+ only · Independent contractor · About 5 minutes to apply</p></div>' +
      '<a class="mc-btn mc-btn--primary mc-btn--lg" href="#">Apply in 5 minutes ' + M.icon("arrow-right") + "</a></section>" +
      '<footer class="lp-foot"><div class="lp-foot__legal">' + M.logo() + "<span><b>" + M.brand.legal + "</b><br>" + M.brand.address + "</span></div>" +
      '<nav aria-label="Legal"><a href="#">Terms</a><a href="#">Privacy</a><a href="#">Contractor agreement</a><a href="#">Contact</a><a href="#">Help center</a></nav>' +
      '<div class="lp-foot__legal"><span>' + M.brand.independence + " Google Business Profile is a trademark of Google LLC.</span><span>Earnings shown are examples, not guarantees. Agents are independent contractors, 18 or older.</span><span>© 2026 " + M.brand.legal + "</span></div></footer></div></div>";
  };
  M.landing = L;
  M.renderLanding = function (el, ids) {
    el.innerHTML = '<div class="mc lp" data-theme="light">' + ids.map(function (k) { return L[k](); }).join("") + "</div>";
    M.hydrate(el);
  };

  /* ---------- Toast ---------- */
  M.toastHTML = function (msg, o) {
    o = o || {};
    return '<div class="mc-toast ' + (o.tone ? "mc-toast--" + o.tone : "") + '" role="status"><span class="mc-toast__icon">' + M.icon(o.icon || "check") + "</span><span>" + msg + "</span>" + (o.action ? '<button type="button" class="mc-toast__btn">' + o.action + "</button>" : "") + "</div>";
  };

  /* ---------- Behaviors ---------- */
  M.hydrate = function (root) {
    root = root || document;
    root.querySelectorAll("[data-brand]").forEach(function (n) { n.textContent = M.brand.name; });
    root.querySelectorAll("[data-icon]").forEach(function (n) { n.outerHTML = M.icon(n.getAttribute("data-icon"), n.className); });
    root.querySelectorAll("[data-est]").forEach(function (box) {
      var range = box.querySelector("[data-est-range]"), lvl = "bronze";
      function upd() {
        var n = +range.value, e = M.estimate(n, lvl);
        box.querySelector("[data-est-n]").textContent = n;
        box.querySelector("[data-est-out]").textContent = M.usd(e.low) + " – " + M.usd(e.high);
        var h = box.querySelector("[data-est-hours]"); if (h) h.textContent = Math.round(n * 0.75) + "–" + n;
        range.style.setProperty("--fill", ((n - 1) / 39 * 100) + "%");
      }
      range.addEventListener("input", upd);
      box.querySelectorAll("[data-est-level] button").forEach(function (b) {
        b.addEventListener("click", function () {
          lvl = b.getAttribute("data-v");
          box.querySelectorAll("[data-est-level] button").forEach(function (x) { x.setAttribute("aria-checked", x === b ? "true" : "false"); });
          upd();
        });
      });
      upd();
    });
    root.querySelectorAll("[data-seg]").forEach(function (g) {
      g.querySelectorAll("button").forEach(function (b) {
        b.addEventListener("click", function () {
          g.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
          var scope = g.closest("[data-views]");
          if (scope) scope.querySelectorAll("[data-view]").forEach(function (v) { v.hidden = v.getAttribute("data-view") !== b.getAttribute("data-v"); });
        });
      });
    });
    root.querySelectorAll(".mc-map").forEach(function (m) {
      var pins = m.querySelectorAll(".mc-pin");
      pins.forEach(function (p) { p.addEventListener("click", function () { pins.forEach(function (x) { x.setAttribute("aria-pressed", x === p ? "true" : "false"); }); }); });
    });
    root.querySelectorAll("[data-chips]").forEach(function (g) {
      g.querySelectorAll(".mc-chip").forEach(function (c) {
        c.addEventListener("click", function () { g.querySelectorAll(".mc-chip").forEach(function (x) { x.setAttribute("aria-checked", x === c ? "true" : "false"); }); });
      });
    });
  };
})();
