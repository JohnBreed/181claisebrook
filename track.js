/**
 * 181 Claisebrook Rd — visitor and UTM tracking.
 * First-touch UTMs are kept; last-touch is updated on later campaigns.
 * Visit pings fire only when the Apps Script URL is set, once per session.
 */
(function (w) {
  var PREFIX = "181cb_";
  var EMAIL = "info@181claisebrook.com.au";

  function endpoint() {
    var f = document.getElementById("inquiry");
    return f && f.action ? f.action : "";
  }
  function endpointReady() {
    var a = endpoint();
    return a && a.indexOf("REPLACE-WITH") === -1;
  }

  function getVisitorId() {
    var id = "";
    try { id = localStorage.getItem(PREFIX + "vid") || ""; } catch (e) {}
    if (!id) {
      id = (w.crypto && crypto.randomUUID) ? crypto.randomUUID() : ("v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
      try { localStorage.setItem(PREFIX + "vid", id); } catch (e) {}
    }
    return id;
  }

  function parseIncoming() {
    var q = new URLSearchParams(location.search);
    var source = (q.get("utm_source") || "").trim();
    var medium = (q.get("utm_medium") || "").trim();
    var campaign = (q.get("utm_campaign") || "").trim();
    var content = (q.get("utm_content") || "").trim();
    if (!source && !medium && !campaign && !content) return null;
    return { source: source, medium: medium, campaign: campaign, content: content };
  }

  function load(key) {
    try { return JSON.parse(localStorage.getItem(PREFIX + key) || "null"); } catch (e) { return null; }
  }
  function save(key, val) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(val)); } catch (e) {}
  }

  var visitorId = getVisitorId();
  var incoming = parseIncoming();
  var now = Date.now();
  if (incoming) {
    if (!load("first")) save("first", { ts: now, utm: incoming });
    save("last", { ts: now, utm: incoming });
  }

  function firstUtm() {
    var first = load("first") || {};
    var last = load("last") || {};
    return first.utm || last.utm || {};
  }

  function attribution() {
    var utm = firstUtm();
    return {
      visitorId: visitorId,
      utm_source: utm.source || "",
      utm_medium: utm.medium || "",
      utm_campaign: utm.campaign || "",
      utm_content: utm.content || ""
    };
  }

  function refLine() {
    var a = attribution();
    return "Ref: " + (a.utm_source || "(direct)");
  }

  function applyToParams(params) {
    var a = attribution();
    params.set("visitorId", a.visitorId);
    params.set("utm_source", a.utm_source);
    params.set("utm_medium", a.utm_medium);
    params.set("utm_campaign", a.utm_campaign);
    params.set("utm_content", a.utm_content);
    return params;
  }

  function pingVisit() {
    if (!endpointReady()) return;
    try { if (sessionStorage.getItem(PREFIX + "visit_sent")) return; } catch (e) {}
    try { sessionStorage.setItem(PREFIX + "visit_sent", "1"); } catch (e) {}
    var landing = incoming || {};
    var params = new URLSearchParams();
    params.set("type", "visit");
    params.set("ts", String(now));
    params.set("visitorId", visitorId);
    params.set("utm_source", landing.source || "");
    params.set("utm_medium", landing.medium || "");
    params.set("utm_campaign", landing.campaign || "");
    params.set("utm_content", landing.content || "");
    params.set("referrer", document.referrer || "");
    params.set("path", location.pathname + location.search);
    params.set("ua", (navigator.userAgent || "").slice(0, 180));
    fetch(endpoint(), { method: "POST", mode: "no-cors", body: params }).catch(function () {});
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pingVisit);
  else pingVisit();

  w.ClaisebrookTrack = {
    attribution: attribution,
    refLine: refLine,
    applyToParams: applyToParams,
    endpoint: endpoint,
    endpointReady: endpointReady,
    visitorId: visitorId,
    email: EMAIL
  };
})(window);
