/**
 * Inspection request form for 181 Claisebrook Rd.
 * Opens from every "Book an inspection" CTA. No calendar embed, no slot picker.
 * Visitor phone is required; the owner's number is never shown.
 */
(function () {
  var EMAIL = "info@181claisebrook.com.au";

  function endpoint() {
    var f = document.getElementById("inquiry");
    return f && f.action ? f.action : "";
  }
  function endpointReady() {
    var a = endpoint();
    return a && a.indexOf("REPLACE-WITH") === -1;
  }

  var overlay, formEl, confirmEl, firstField;

  function openInspectionRequest() {
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    confirmEl.hidden = true;
    formEl.hidden = false;
    formEl.reset();
    setTimeout(function () { firstField.focus(); }, 50);
  }
  function closeInspectionRequest() {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
  window.openInspectionRequest = openInspectionRequest;

  function mailtoFallback(data) {
    var body = [
      "Inspection request: 181 Claisebrook Road",
      "",
      "Name: " + data.name,
      "Email: " + data.email,
      "Phone: " + data.phone,
      "What does your business do?: " + data.business,
      "How long have you been in business?: " + data.yearsInBusiness,
      "What lease term are you after?: " + data.leaseTerm,
      "Why are you interested in leasing?: " + data.note
    ].join("\n");
    var url = "mailto:" + EMAIL + "?subject=" + encodeURIComponent("Inspection request: 181 Claisebrook Rd") + "&body=" + encodeURIComponent(body);
    var a = document.createElement("a");
    a.href = url;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function submitInspection(data) {
    var params = new URLSearchParams();
    params.set("type", "inspection");
    params.set("name", data.name);
    params.set("email", data.email);
    params.set("phone", data.phone);
    params.set("business", data.business);
    params.set("yearsInBusiness", data.yearsInBusiness);
    params.set("leaseTerm", data.leaseTerm);
    params.set("note", data.note);
    params.set("source", "inspection-form");
    if (!endpointReady()) {
      mailtoFallback(data);
      return Promise.resolve({ fallback: true });
    }
    return fetch(endpoint(), { method: "POST", mode: "no-cors", body: params })
      .then(function () { return { ok: true }; })
      .catch(function () { mailtoFallback(data); return { fallback: true }; });
  }

  function build() {
    overlay = document.createElement("div");
    overlay.className = "bk-overlay";
    overlay.id = "inspection-request";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "bk-title");
    overlay.setAttribute("aria-hidden", "true");

    overlay.innerHTML =
      '<div class="bk-modal">' +
        '<div class="bk-head">' +
          '<div><h2 id="bk-title">Inspection request</h2>' +
          '<p>Tell us a little about you and why you want to inspect 181 Claisebrook Road. We\'ll be in touch by email to arrange a time. Contact is by this form or <a href="mailto:' + EMAIL + '">' + EMAIL + '</a> — we don\'t publish a phone number.</p></div>' +
          '<button class="bk-x" type="button" aria-label="Close inspection request">&times;</button>' +
        '</div>' +
        '<div class="bk-body">' +
          '<form class="bk-form" id="bk-form" novalidate="novalidate">' +
            '<div><label for="bk-name">Name *</label><input id="bk-name" name="name" required autocomplete="name"></div>' +
            '<div><label for="bk-email">Email *</label><input id="bk-email" name="email" type="email" required autocomplete="email"></div>' +
            '<div><label for="bk-phone">Phone *</label><input id="bk-phone" name="phone" type="tel" required autocomplete="tel"></div>' +
            '<div><label for="bk-business">What does your business do? *</label><input id="bk-business" name="business" required autocomplete="organization"></div>' +
            '<div><label for="bk-years">How long have you been in business? *</label><input id="bk-years" name="yearsInBusiness" required placeholder="e.g. 5 years"></div>' +
            '<div><label for="bk-term">What lease term are you after? *</label><input id="bk-term" name="leaseTerm" required placeholder="e.g. 3 years + 3"></div>' +
            '<div><label for="bk-note">Why are you interested in leasing? *</label><textarea id="bk-note" name="note" required rows="4" placeholder="A short note is fine"></textarea></div>' +
            '<p class="bk-note">We only use these details to arrange an inspection and respond about this property. If the form isn\'t connected yet, your email app will open to ' + EMAIL + '.</p>' +
            '<button class="bk-submit" type="submit">Send inspection request</button>' +
          '</form>' +
          '<div class="bk-confirm" id="bk-confirm" hidden>' +
            '<h3>Request received</h3>' +
            '<p id="bk-confirm-text">Thanks, we\'ll review your request and be in touch by email to arrange a time.</p>' +
            '<button class="btn" type="button" id="bk-done">Close</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    formEl = overlay.querySelector("#bk-form");
    confirmEl = overlay.querySelector("#bk-confirm");
    firstField = overlay.querySelector("#bk-name");
    var confirmText = overlay.querySelector("#bk-confirm-text");

    overlay.querySelector(".bk-x").addEventListener("click", closeInspectionRequest);
    overlay.querySelector("#bk-done").addEventListener("click", closeInspectionRequest);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) closeInspectionRequest(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) closeInspectionRequest();
    });

    formEl.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!formEl.reportValidity()) return;
      var data = {
        name: formEl.name.value.trim(),
        email: formEl.email.value.trim(),
        phone: formEl.phone.value.trim(),
        business: formEl.business.value.trim(),
        yearsInBusiness: formEl.yearsInBusiness.value.trim(),
        leaseTerm: formEl.leaseTerm.value.trim(),
        note: formEl.note.value.trim()
      };
      if (!data.name || !data.email || !data.phone || !data.business || !data.yearsInBusiness || !data.leaseTerm || !data.note) return;
      var btn = formEl.querySelector(".bk-submit");
      btn.disabled = true;
      btn.textContent = "Sending…";
      submitInspection(data).then(function (res) {
        btn.disabled = false;
        btn.textContent = "Send inspection request";
        formEl.hidden = true;
        confirmEl.hidden = false;
        if (res && res.fallback) {
          confirmText.textContent = "Thanks, we'll review your request and be in touch by email to arrange a time. If your email app opened, please send that message to " + EMAIL + " so we receive it.";
        } else {
          confirmText.textContent = "Thanks, we'll review your request and be in touch by email to arrange a time.";
        }
        overlay.querySelector("#bk-done").focus();
      });
    });

    document.querySelectorAll(".js-book-inspection, a[href='#inspection']").forEach(function (n) {
      n.addEventListener("click", function (e) {
        e.preventDefault();
        openInspectionRequest();
      });
    });

    if (location.hash === "#inspection") openInspectionRequest();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
