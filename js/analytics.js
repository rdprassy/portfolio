(function () {
  "use strict";

  const loaderScript = document.currentScript;
  const configUrl = loaderScript && loaderScript.src
    ? new URL("analytics-config.js", loaderScript.src).href
    : "js/analytics-config.js";
  const configScript = document.createElement("script");

  configScript.src = configUrl;
  configScript.async = false;
  configScript.addEventListener("load", initialiseAnalytics);
  configScript.addEventListener("error", initialiseAnalytics);
  document.head.appendChild(configScript);

  function initialiseAnalytics() {
    const config = window.RDPRASSY_ANALYTICS_CONFIG || {};
    const measurementId = String(config.googleMeasurementId || "").trim().toUpperCase();
    const hasValidMeasurementId = /^G-[A-Z0-9]+$/.test(measurementId);
    const consentVersion = String(config.consentVersion || "1");
    const consentKey = "rdprassy-analytics-consent:" + consentVersion;
    const pendingEvents = Array.isArray(window.rdprassyEventQueue)
      ? window.rdprassyEventQueue.splice(0)
      : [];
    const usesPortfolioRuntime = Array.from(document.scripts).some(function (script) {
      return /(?:^|\/)site\.js(?:[?#].*)?$/.test(script.src || "");
    });
    let consent = readConsent();
    let tagLoaded = false;
    let banner = null;

    if (!usesPortfolioRuntime && !pendingEvents.some(function (item) {
      return item && item.event === "page_view";
    })) {
      pendingEvents.unshift({
        event: "page_view",
        page: window.location.pathname.split("/").pop() || "index.html",
        title: document.title
      });
    }

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };

    window.gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
      wait_for_update: 500
    });
    window.gtag("set", "ads_data_redaction", true);

    window.rdprassyAnalytics = {
      configured: hasValidMeasurementId,
      measurementId: hasValidMeasurementId ? measurementId : "",
      getConsent: function () {
        return consent || "unset";
      },
      openPreferences: function () {
        if (hasValidMeasurementId) {
          renderConsentPanel(true);
        }
      },
      setConsent: setConsent,
      track: track
    };

    addPrivacyControls();

    if (!hasValidMeasurementId) {
      pendingEvents.length = 0;
      if (config.debug && window.console) {
        console.info("GA4 is ready but inactive. Add a G- measurement ID in js/analytics-config.js.");
      }
      return;
    }

    if (consent === "granted") {
      enableAnalytics();
    } else if (!consent) {
      renderConsentPanel(false);
    }

    function readConsent() {
      try {
        const value = localStorage.getItem(consentKey);
        return value === "granted" || value === "denied" ? value : "";
      } catch (error) {
        return "";
      }
    }

    function persistConsent(value) {
      try {
        localStorage.setItem(consentKey, value);
      } catch (error) {
        // The choice remains active for this page when storage is unavailable.
      }
    }

    function setConsent(value) {
      consent = value === "granted" ? "granted" : "denied";
      persistConsent(consent);
      window.gtag("consent", "update", {
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        analytics_storage: consent
      });
      removeConsentPanel();

      if (consent === "granted") {
        enableAnalytics();
      } else {
        pendingEvents.length = 0;
      }
    }

    function enableAnalytics() {
      if (tagLoaded) {
        return;
      }

      tagLoaded = true;
      const googleTag = document.createElement("script");
      googleTag.async = true;
      googleTag.src = "https://www.googletagmanager.com/gtag/js?id=" +
        encodeURIComponent(measurementId);
      document.head.appendChild(googleTag);

      window.gtag("js", new Date());
      window.gtag("config", measurementId, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        cookie_flags: "SameSite=None;Secure",
        transport_type: "beacon"
      });

      pendingEvents.splice(0).forEach(sendEvent);
    }

    function track(eventDetail) {
      if (!eventDetail || !eventDetail.event || consent === "denied") {
        return;
      }

      if (consent !== "granted" || !tagLoaded) {
        if (pendingEvents.length < 50) {
          pendingEvents.push(eventDetail);
        }
        return;
      }

      sendEvent(eventDetail);
    }

    function sendEvent(eventDetail) {
      const eventName = sanitiseEventName(eventDetail.event);
      if (!eventName) {
        return;
      }

      const parameters = {
        send_to: measurementId,
        page_path: window.location.pathname,
        site_section: eventDetail.page || "index.html"
      };

      if (eventDetail.title) {
        parameters.page_title = String(eventDetail.title).slice(0, 100);
      }
      if (eventDetail.label) {
        parameters.event_label = String(eventDetail.label).slice(0, 100);
      }
      if (eventDetail.destination) {
        parameters.link_destination = sanitiseDestination(eventDetail.destination);
      }

      [
        "dom_content_loaded_ms",
        "load_ms",
        "transfer_bytes",
        "result_count",
        "top_k",
        "threshold",
        "sample_query"
      ].forEach(function (key) {
        if (eventDetail[key] !== undefined) {
          parameters[key] = eventDetail[key];
        }
      });

      if (eventName === "page_view") {
        parameters.page_location = window.location.origin + window.location.pathname;
        parameters.page_title = parameters.page_title || document.title;
      }
      if (config.debug) {
        parameters.debug_mode = true;
      }

      window.gtag("event", eventName, parameters);
    }

    function sanitiseEventName(name) {
      return String(name)
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 40);
    }

    function sanitiseDestination(destination) {
      if (String(destination).startsWith("mailto:")) {
        return "email";
      }
      try {
        const url = new URL(destination, window.location.href);
        return url.origin === window.location.origin ? url.pathname : url.hostname;
      } catch (error) {
        return "unknown";
      }
    }

    function addPrivacyControls() {
      const footer = document.querySelector(".footer-bottom");
      if (document.querySelector("[data-analytics-footer]")) {
        return;
      }

      const controls = document.createElement(footer ? "span" : "aside");
      const privacyLink = document.createElement("a");
      controls.className = footer ? "analytics-footer-links" : "analytics-legacy-links";
      controls.dataset.analyticsFooter = "";
      privacyLink.href = "privacy.html";
      privacyLink.textContent = "Privacy";
      controls.appendChild(privacyLink);

      if (hasValidMeasurementId) {
        const preferencesButton = document.createElement("button");
        preferencesButton.type = "button";
        preferencesButton.textContent = "Analytics choices";
        preferencesButton.addEventListener("click", function () {
          renderConsentPanel(true);
        });
        controls.appendChild(preferencesButton);
      }

      (footer || document.body).appendChild(controls);
    }

    function renderConsentPanel(isPreferences) {
      removeConsentPanel();
      banner = document.createElement("aside");
      banner.className = "analytics-consent";
      banner.setAttribute("role", "dialog");
      banner.setAttribute("aria-modal", "true");
      banner.setAttribute("aria-labelledby", "analytics-consent-title");
      banner.innerHTML =
        '<div class="analytics-consent__copy">' +
          '<span class="kicker">Privacy-first measurement</span>' +
          '<h2 id="analytics-consent-title">' +
            (isPreferences ? "Analytics choices" : "Help improve this portfolio") +
          "</h2>" +
          "<p>Optional Google Analytics helps measure page visits, résumé downloads, " +
          "and project interactions. Advertising storage stays disabled, and AI lab " +
          "questions, email content, and form data are never collected.</p>" +
          '<a href="privacy.html">Read the privacy details</a>' +
        "</div>" +
        '<div class="analytics-consent__actions">' +
          '<button class="button button--primary" type="button" data-analytics-accept>' +
            "Allow analytics" +
          "</button>" +
          '<button class="button" type="button" data-analytics-decline>' +
            "Decline" +
          "</button>" +
        "</div>";

      banner.querySelector("[data-analytics-accept]").addEventListener("click", function () {
        setConsent("granted");
      });
      banner.querySelector("[data-analytics-decline]").addEventListener("click", function () {
        setConsent("denied");
      });
      document.body.appendChild(banner);
      banner.querySelector("button").focus({ preventScroll: true });
    }

    function removeConsentPanel() {
      if (banner) {
        banner.remove();
        banner = null;
      }
    }
  }
})();
