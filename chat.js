/**
 * 181 Claisebrook Rd — listing chat widget
 *
 * Phase 1 (default, no API key): scripted FAQ from listing facts only.
 * Phase 2 (off): set USE_LLM to true only after the Apps Script "chat"
 * path is deployed and OPENAI_API_KEY is in Script Properties.
 */
(function () {
  var EMAIL = "info@181claisebrook.com.au";
  var USE_LLM = false; // Phase 2 flag — leave false until the LLM path is ready

  var FACTS = {
    rent: "Lease $60,000 p.a. + outgoings. The property is leased as the whole building only.",
    whole: "The property is leased as the whole building only (approx. 280 sqm). It is not available in part.",
    size: "The building is approx. 280 sqm on a single level, on 468 sqm of land, with 13.66 m frontage. Areas are approximate.",
    specs: "It's a single-level converted office/warehouse, currently fitted out as food laboratories. The listing specs are: 3 on-site car bays plus street parking nearby, 3-phase power, air conditioning, a monitored alarm system, reception, individual meeting rooms and offices, open-plan lab areas with stainless benching, a cool room, staff amenities, a storeroom/archive and wash rooms. The front roller door is currently fixed shut; its condition is to be confirmed.",
    location: "181 Claisebrook Road, Perth WA 6000, in the Claisebrook precinct, East Perth (City of Vincent). Approximate distances from the sale information memorandum (Dec 2025): 400 m to Claisebrook train station, 550 m to the Graham Farmer Fwy on/off, 1.4 km to the Perth CBD, 1.5 km to Northbridge, 800 m to the Swan River, and 1.5 km to Optus Stadium.",
    nata: "It was previously home to a NATA-accredited laboratory for about 25 years, with reception, meeting rooms, offices and lab areas already in place.",
    approvals: "The tenant is responsible for getting and keeping its own planning/use approvals, licences and registrations, for any fit-out works (with the landlord's consent), and for make-good at the end of the lease. Information is indicative only and doesn't form part of any lease. Please make your own enquiries.",
    roller: "The front roller door is currently fixed shut; its condition is to be confirmed.",
    inspect: "Inspections are by appointment. Email " + EMAIL + " or leave your details here and I'll pass them to the owner. Contact is by email, the enquiry form, or this chat — there is no phone number on this listing.",
    available: "The building is vacant and available immediately. Inspections are by appointment — email " + EMAIL + " or leave your details and I'll pass them to the owner.",
    uses: "It suits food production, a commercial kitchen, meal prep, catering or a NATA-style lab. It can also be stripped back to open office/warehouse, by negotiation.",
    fitout: "The existing fit-out can be kept as-is, or the owner will look at stripping it back to open office/warehouse, by negotiation. Lease term and incentives are also by negotiation.",
    cool: "A cool room is on site. Ask about its current condition and servicing.",
    contact: "You can enquire on this page or email " + EMAIL + ". Contact is by the enquiry form, email, or this chat — there is no phone number on this listing.",
    floor: "A floor plan is coming soon and will be added to this page once it is ready. In the meantime the listing photos and specs are on this page, and inspections are by appointment."
  };

  var INTENTS = [
    { id: "roller", re: /\broller(\s*door)?\b|\bloading\s*(dock|door)\b/ },
    { id: "approvals", re: /\bapprov|\blicen[cs]e|\bpermit|\bplanning|\bmake[-\s]?good|\bzon(?:e|ing)\b|\bcouncil\b|\bvince/ },
    { id: "nata", re: /\bnata\b|\baccredited\b|\bformer\b|\bprevious(?:ly)?\b|\bhistory\b|\blast tenant\b|\bwho (?:was|used)\b/ },
    { id: "inspect", re: /\binspect|\bviewing\b|\bview\b|\blook around\b|\btour\b|\bappointment\b|\bbook\b|\bvisit\b|\bwalk[- ]through\b/ },
    { id: "rent", re: /\brent\b|\bprice\b|\bcost\b|\bhow much\b|\bp\.?a\.?\b|\bper annum\b|\b60,?000\b|\boutgoing|\basking\b|\blease from\b/ },
    { id: "whole", re: /\bwhole\b|\bpart(?:ial(?:ly)?)?\b|\bsplit\b|\bshare\b|\bsub-?let|\bportion\b|\bsmaller\b|\bhalf\b|\bonly need\b|\bdividing\b|\bunit\b/ },
    { id: "floor", re: /\bfloor\s*plan\b|\blayout\b/ },
    { id: "cool", re: /\bcool\s*room\b|\bcold\s*stor|\bfridge\b|\brefrigerat/ },
    { id: "size", re: /\bsize\b|\barea\b|\bsqm\b|\bm2\b|\bsquare\s*met|\bland\b|\bfrontage\b|\bhow big\b|\bsq\s*m\b|\b280\b|\b468\b/ },
    { id: "specs", re: /\bspecs?\b|\bpower\b|\b3-?phase\b|\bparking\b|\bbays?\b|\bair ?con|\balarm\b|\bfit-?out\b|\bbench|\bamenities\b|\bwash ?room|\bstoreroom|\bsecurity\b/ },
    { id: "location", re: /\blocation\b|\bwhere\b|\baddress\b|\bsuburb\b|\bcbd\b|\bstation\b|\bfreeway\b|\bfwy\b|\bnorthbridge\b|\bstadium\b|\beast perth\b|\bvincent\b|\bclaisebrook\b|\bhow far\b|\bdistance/ },
    { id: "fitout", re: /\bstrip\b|\bclean shell\b|\bincentive|\blease term|\bflexible on fit/ },
    { id: "uses", re: /\bsuit|\bkitchen\b|\bcater|\bmeal prep\b|\bfood\b|\blab(?:oratory)?\b|\bwarehouse\b|\boffice\b|\buse it for\b|\bintended use\b/ },
    { id: "available", re: /\bavailab|\bvacant\b|\bwhen can\b|\bstart date\b|\bimmediately\b|\bempty\b|\bmove in\b/ },
    { id: "contact", re: /\bcontact\b|\bemail\b|\bphone\b|\bcall\b|\bnumber\b|\breach\b|\bget in touch\b/ },
    { id: "greeting", re: /^(hi|hello|hey|g'day|good (morning|afternoon|evening)|thanks|thank you|cheers)\b/ }
  ];

  var CHIPS = {
    home: [
      { t: "Rent", q: "What is the rent?" },
      { t: "Size & specs", q: "What are the size and specs?" },
      { t: "Location", q: "Where is it?" },
      { t: "Whole building only", q: "Is the whole building for lease?" },
      { t: "Book an inspection", q: "How do I book an inspection?" },
      { t: "Leave an enquiry", q: "I'd like to leave an enquiry" }
    ],
    after: [
      { t: "Leave an enquiry", q: "I'd like to leave an enquiry" },
      { t: "Book an inspection", q: "How do I book an inspection?" },
      { t: "More questions", q: "What else can you tell me?" }
    ]
  };

  function endpoint() {
    var f = document.getElementById("inquiry");
    return f && f.action ? f.action : "";
  }
  function endpointReady() {
    var a = endpoint();
    return a && a.indexOf("REPLACE-WITH") === -1;
  }

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "class") n.className = attrs[k];
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else if (k === "html") n.innerHTML = attrs[k];
      else if (attrs[k] !== false && attrs[k] != null) n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }

  function linkify(text) {
    var esc = text.replace(/[&<>]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]; });
    return esc.replace(EMAIL, '<a href="mailto:' + EMAIL + '">' + EMAIL + "</a>");
  }

  var root, logEl, chipsEl, inputEl, panel, fab;

  function addMsg(role, text) {
    var d = el("div", { class: "cb-msg cb-" + role, html: text.split(/\n\n/).map(function (p) { return "<p>" + linkify(p) + "</p>"; }).join("") });
    logEl.appendChild(d);
    logEl.scrollTop = logEl.scrollHeight;
    return d;
  }

  function setChips(items) {
    chipsEl.innerHTML = "";
    (items || []).forEach(function (c) {
      chipsEl.appendChild(el("button", { class: "cb-chip", type: "button", onClick: function () {
        if (c.t === "Book an inspection" && typeof window.openInspectionRequest === "function") {
          closeChat();
          window.openInspectionRequest();
          return;
        }
        handleUser(c.q, c.t);
      } }, [c.t]));
    });
  }

  function matchIntent(text) {
    var q = text.toLowerCase().replace(/\s+/g, " ").trim();
    if (/enquir|inquiry|leave (my )?details|pass (that )?to the owner|get back to me|contact (the )?owner/.test(q) && !/\bhow do i book/.test(q)) {
      return "lead";
    }
    if (/what else|more question|what can you/.test(q)) return "menu";
    for (var i = 0; i < INTENTS.length; i++) {
      if (INTENTS[i].re.test(q)) return INTENTS[i].id;
    }
    return "unknown";
  }

  function replyFor(id) {
    if (id === "greeting") return "Hello — I can answer questions about 181 Claisebrook Road from the listing facts on this page. I won't guess. If I don't know, I'll pass it to the owner.";
    if (id === "menu") return "I can help with the rent, size and specs, location, the former NATA lab fit-out, approvals, the roller door, inspections, or taking an enquiry for the owner.";
    return FACTS[id] || null;
  }

  function leadForm(prefillMsg) {
    var form = el("form", { class: "cb-form" });
    function field(id, label, type, required, extra) {
      var wrap = el("div", {});
      wrap.appendChild(el("label", { for: "cb-" + id }, [label]));
      var inp;
      if (type === "select") {
        inp = el("select", { id: "cb-" + id, name: id, required: true });
        ["", "Commercial kitchen", "Meal prep", "Catering", "Food production / manufacturing", "Laboratory (NATA or other)", "Cold storage", "Office / warehouse (strip-out)", "Other"].forEach(function (o) {
          inp.appendChild(el("option", { value: o }, [o || "Select…"]));
        });
      } else if (type === "textarea") {
        inp = el("textarea", { id: "cb-" + id, name: id, rows: "3" });
        if (prefillMsg) inp.value = prefillMsg;
      } else {
        inp = el("input", { id: "cb-" + id, name: id, type: type || "text", required: !!required, autocomplete: extra || "off" });
        if (id === "budget") { inp.setAttribute("inputmode", "decimal"); inp.setAttribute("placeholder", "e.g. 60,000"); }
      }
      wrap.appendChild(inp);
      form.appendChild(wrap);
      return inp;
    }
    field("name", "Name *", "text", true, "name");
    field("email", "Email *", "email", true, "email");
    field("use", "Intended use *", "select", true);
    field("budget", "Your rent budget ($ per annum) *", "text", true);
    field("msg", "Message", "textarea");
    form.appendChild(el("p", { class: "cb-note" }, ["We'll only use this to respond about this property. If the form isn't connected yet, your email app will open to " + EMAIL + "."]));
    var btn = el("button", { class: "cb-send", type: "submit" }, ["Send to the owner"]);
    form.appendChild(btn);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = {
        name: form.querySelector("#cb-name").value.trim(),
        email: form.querySelector("#cb-email").value.trim(),
        use: form.querySelector("#cb-use").value,
        budget: form.querySelector("#cb-budget").value.trim(),
        message: form.querySelector("#cb-msg").value.trim()
      };
      if (!data.name || !data.email || !data.use || !data.budget) return;
      btn.disabled = true; btn.textContent = "Sending…";
      submitLead(data).then(function (res) {
        form.remove();
        if (res && res.fallback) {
          addMsg("bot", "The enquiry form isn't connected yet, so I've opened an email to " + EMAIL + " with your details. If that didn't open, please email " + EMAIL + " directly.");
        } else {
          addMsg("bot", "Thanks, your enquiry has been passed to the owner. They'll be in touch shortly by email.");
        }
        setChips(CHIPS.after);
      });
    });
    var wrap = el("div", { class: "cb-msg cb-bot" });
    wrap.appendChild(form);
    logEl.appendChild(wrap);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function mailtoFallback(data) {
    var ref = (window.ClaisebrookTrack && ClaisebrookTrack.refLine) ? ClaisebrookTrack.refLine() : "Ref: (direct)";
    var body = ["Name: " + data.name, "Email: " + data.email, "Intended use: " + data.use, "Rent budget p.a.: " + data.budget, "Source: chat", ref, "", data.message || ""].join("\n");
    var url = "mailto:" + EMAIL + "?subject=" + encodeURIComponent("Lease enquiry: 181 Claisebrook Rd") + "&body=" + encodeURIComponent(body);
    var a = document.createElement("a");
    a.href = url;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function submitLead(data) {
    var params = new URLSearchParams();
    params.set("name", data.name);
    params.set("email", data.email);
    params.set("intended_use", data.use);
    params.set("budget", data.budget);
    params.set("message", data.message);
    params.set("source", "chat");
    if (window.ClaisebrookTrack && ClaisebrookTrack.applyToParams) ClaisebrookTrack.applyToParams(params);
    params.set("business", "");
    params.set("phone", "");
    params.set("preferred_start", "");
    if (!endpointReady()) {
      mailtoFallback(data);
      return Promise.resolve({ fallback: true });
    }
    return fetch(endpoint(), { method: "POST", mode: "no-cors", body: params })
      .then(function () { return { ok: true }; })
      .catch(function () { mailtoFallback(data); return { fallback: true }; });
  }

  function askLlm(text) {
    if (!USE_LLM || !endpointReady()) return Promise.resolve(null);
    var params = new URLSearchParams();
    params.set("mode", "chat");
    params.set("message", text);
    return fetch(endpoint(), { method: "POST", body: params, headers: { "Accept": "application/json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return j && j.ok && j.reply ? String(j.reply) : null; })
      .catch(function () { return null; });
  }

  function handleUser(text, display) {
    var q = (text || "").trim();
    if (!q) return;
    addMsg("user", display || q);
    inputEl.value = "";
    var id = matchIntent(q);
    if (id === "lead") {
      addMsg("bot", "I'll pass that to the owner. Leave your name, email, intended use, rent budget and a message and they'll get back to you.");
      setChips([]);
      leadForm(q);
      return;
    }
    var scripted = replyFor(id);
    function finish(reply, chips) {
      addMsg("bot", reply);
      setChips(chips || CHIPS.after);
      if (id === "inspect" || id === "available") {
        // Offer capture after inspection/availability answers
      }
    }
    if (id === "unknown") {
      askLlm(q).then(function (llm) {
        if (llm) { finish(llm, CHIPS.after); return; }
        addMsg("bot", "I'll pass that to the owner — I only answer from the facts on this listing, and I don't want to guess. Leave your details and they'll get back to you.");
        setChips([]);
        leadForm(q);
      });
      return;
    }
    if (!scripted) {
      addMsg("bot", "I'll pass that to the owner. Leave your details and they'll get back to you.");
      setChips([]);
      leadForm(q);
      return;
    }
    finish(scripted, id === "greeting" || id === "menu" ? CHIPS.home : CHIPS.after);
  }

  function openChat() {
    root.classList.add("is-open");
    fab.setAttribute("aria-expanded", "true");
    panel.setAttribute("aria-hidden", "false");
    if (!logEl.childNodes.length) {
      addMsg("bot", "Hello — I'm a listing assistant for 181 Claisebrook Road. I can answer from the facts on this page (rent, specs, location and how to inspect). I won't guess. If I don't know, I'll pass it to the owner.");
      setChips(CHIPS.home);
    }
    setTimeout(function () { inputEl.focus(); }, 50);
  }
  function closeChat() {
    root.classList.remove("is-open");
    fab.setAttribute("aria-expanded", "false");
    panel.setAttribute("aria-hidden", "true");
    fab.focus();
  }

  function build() {
    fab = el("button", { class: "cb-fab", type: "button", "aria-expanded": "false", "aria-controls": "cb-panel", onClick: openChat });
    fab.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8A2.5 2.5 0 0 1 17.5 17H9l-4 3v-3.2A2.5 2.5 0 0 1 4 14.5v-8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg><span class="cb-fab-label">Ask a question</span>';
    panel = el("section", { id: "cb-panel", class: "cb-panel", role: "dialog", "aria-label": "Listing chat for 181 Claisebrook Road", "aria-hidden": "true" });
    var head = el("div", { class: "cb-head" });
    var titles = el("div", {});
    titles.appendChild(el("b", {}, ["181 Claisebrook Rd"]));
    titles.appendChild(el("span", {}, ["Listing assistant · not a live agent"]));
    head.appendChild(titles);
    head.appendChild(el("button", { class: "cb-x", type: "button", "aria-label": "Close chat", onClick: closeChat }, ["×"]));
    logEl = el("div", { class: "cb-log", role: "log", "aria-live": "polite" });
    chipsEl = el("div", { class: "cb-chips" });
    var composer = el("form", { class: "cb-composer" });
    inputEl = el("input", { type: "text", "aria-label": "Your question", placeholder: "Ask about the listing…", maxlength: "500", autocomplete: "off" });
    var send = el("button", { type: "submit" }, ["Send"]);
    composer.appendChild(inputEl);
    composer.appendChild(send);
    composer.addEventListener("submit", function (e) { e.preventDefault(); handleUser(inputEl.value); });
    panel.appendChild(head);
    panel.appendChild(logEl);
    panel.appendChild(chipsEl);
    panel.appendChild(composer);
    root = el("div", { class: "cb-root" });
    root.appendChild(panel);
    root.appendChild(fab);
    document.body.appendChild(root);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && root.classList.contains("is-open")) closeChat(); });
    if (/[?&]chat=open\b/.test(location.search) || location.hash === "#chat") openChat();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
