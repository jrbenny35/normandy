/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const {utils: Cu} = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(
  this, "AppConstants", "resource://gre/modules/AppConstants.jsm"
);
XPCOMUtils.defineLazyModuleGetter(
  this, "CleanupManager", "resource://shield-recipe-client/lib/CleanupManager.jsm"
);

this.EXPORTED_SYMBOLS = ["ShieldPreferences"];

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const NS_PREFBRANCH_PREFCHANGE_TOPIC_ID = "nsPref:changed"; // from modules/libpref/nsIPrefBranch.idl
const FHR_UPLOAD_ENABLED_PREF = "datareporting.healthreport.uploadEnabled";
const OPT_OUT_STUDIES_ENABLED_PREF = "app.shield.optoutstudies.enabled";

/**
 * Handles Shield-specific preferences, including their UI.
 */
this.ShieldPreferences = {
  async init() {
    // Disabled outside of en-* locales temporarily (bug 1377192).
    // Disabled when MOZ_DATA_REPORTING is false since the FHR UI is also hidden
    // when data reporting is false.
    if (AppConstants.MOZ_DATA_REPORTING && Services.locale.getAppLocaleAsLangTag().startsWith("en")) {
      Services.obs.addObserver(this, "advanced-pane-loaded");
      Services.prefs.addObserver(FHR_UPLOAD_ENABLED_PREF, this);

      CleanupManager.addCleanupHandler(() => {
        Services.obs.removeObserver(this, "advanced-pane-loaded");
        Services.prefs.removeObserver(FHR_UPLOAD_ENABLED_PREF, this);
      });
    }
  },

  observe(subject, topic, data) {
    switch (topic) {
      // Add the opt-out-study checkbox to the Privacy preferences when it is shown.
      case "advanced-pane-loaded":
        if (!Services.prefs.getBoolPref("browser.preferences.useOldOrganization", false)) {
          const checkbox = new this.OptOutStudyCheckbox(subject.document);
          checkbox.inject();
        }
        break;
      // If the FHR pref changes, set the opt-out-study pref to the value it is changing to.
      case NS_PREFBRANCH_PREFCHANGE_TOPIC_ID:
        if (data === FHR_UPLOAD_ENABLED_PREF) {
          const fhrUploadEnabled = Services.prefs.getBoolPref(FHR_UPLOAD_ENABLED_PREF);
          Services.prefs.setBoolPref(OPT_OUT_STUDIES_ENABLED_PREF, fhrUploadEnabled);
        }
        break;
    }
  },

  /**
   * Injects the opt-out-study preference checkbox into about:preferences and
   * handles events coming from the UI for it.
   */
  OptOutStudyCheckbox: class {
    constructor(document) {
      this.document = document;
      this.refs = {};

      const container = this.refs.container = document.createElementNS(XUL_NS, "vbox");
      container.classList.add("indent");

      const hContainer = this.refs.hContainer = document.createElementNS(XUL_NS, "hbox");
      hContainer.setAttribute("align", "center");
      container.appendChild(hContainer);

      const checkbox = this.refs.checkbox = document.createElementNS(XUL_NS, "checkbox");
      checkbox.setAttribute("id", "optOutStudiesEnabled");
      checkbox.setAttribute("label", "Allow Firefox to install and run studies");
      checkbox.setAttribute("preference", OPT_OUT_STUDIES_ENABLED_PREF);
      checkbox.setAttribute("checked", Services.prefs.getBoolPref(OPT_OUT_STUDIES_ENABLED_PREF));
      checkbox.setAttribute("disabled", !Services.prefs.getBoolPref(FHR_UPLOAD_ENABLED_PREF));
      hContainer.appendChild(checkbox);

      const viewStudies = this.refs.viewStudies = document.createElementNS(XUL_NS, "label");
      viewStudies.setAttribute("id", "viewShieldStudies");
      viewStudies.textContent = "View Firefox Studies";
      viewStudies.classList.add("learnMore", "text-link");
      viewStudies.addEventListener("click", this);
      hContainer.appendChild(viewStudies);

      // <prefrence> elements for prefs that we need to monitor while the page is open.
      const optOutPref = this.refs.optOutPref = document.createElementNS(XUL_NS, "preference");
      optOutPref.setAttribute("id", OPT_OUT_STUDIES_ENABLED_PREF);
      optOutPref.setAttribute("name", OPT_OUT_STUDIES_ENABLED_PREF);
      optOutPref.setAttribute("type", "bool");

      // Weirdly, FHR doesn't have a <preference> element on the page, so we create it.
      const fhrPref = this.refs.fhrPref = document.createElementNS(XUL_NS, "preference");
      fhrPref.setAttribute("id", FHR_UPLOAD_ENABLED_PREF);
      fhrPref.setAttribute("name", FHR_UPLOAD_ENABLED_PREF);
      fhrPref.setAttribute("type", "bool");
      fhrPref.addEventListener("change", this);
    }

    inject() {
      const parent = this.document.getElementById("submitHealthReportBox").closest("vbox");
      parent.appendChild(this.refs.container);

      const preferences = this.document.getElementById("privacyPreferences");
      preferences.appendChild(this.refs.optOutPref);
      preferences.appendChild(this.refs.fhrPref);
    }

    remove() {
      this.refs.container.remove();
    }

    handleEvent(event) {
      switch (event.target.id) {
        // Open about:studies when the "View Firefox Studies" link is clicked
        case "viewShieldStudies":
          this.document.location = "about:studies";
          break;
        // Disable/enable the checkbox when the FHR pref changes.
        case FHR_UPLOAD_ENABLED_PREF:
          this.refs.checkbox.disabled = !Services.prefs.getBoolPref(FHR_UPLOAD_ENABLED_PREF);
          break;
      }
    }
  },
};
