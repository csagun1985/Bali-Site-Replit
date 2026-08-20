"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isAppleMobile() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  const appleNavigator = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || appleNavigator.standalone === true;
}

export default function PwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [appleMobile, setAppleMobile] = useState(false);

  useEffect(() => {
    const initialise = window.setTimeout(() => {
      setInstalled(isStandalone());
      setAppleMobile(isAppleMobile());
    }, 0);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // The site remains usable online if registration is blocked by the browser.
      });
    }

    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const markInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setInstructionsOpen(false);
    };
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const syncDisplayMode = () => setInstalled(isStandalone());

    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", markInstalled);
    displayMode.addEventListener?.("change", syncDisplayMode);

    return () => {
      window.clearTimeout(initialise);
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", markInstalled);
      displayMode.removeEventListener?.("change", syncDisplayMode);
    };
  }, []);

  if (installed) {
    return <span className="installed-pill" aria-label="Bali Hub is installed">App installed</span>;
  }

  const install = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstallPrompt(null);
      }
      return;
    }
    setInstructionsOpen(true);
  };

  return <>
    <button className="install-app-button" type="button" onClick={install}>
      <span aria-hidden="true">↓</span> Install app
    </button>
    {instructionsOpen && <div className="install-dialog-backdrop" role="presentation" onClick={() => setInstructionsOpen(false)}>
      <section className="install-dialog" role="dialog" aria-modal="true" aria-labelledby="install-dialog-title" onClick={event => event.stopPropagation()}>
        <button className="install-dialog-close" type="button" onClick={() => setInstructionsOpen(false)} aria-label="Close install instructions">×</button>
        <img src="/icons/icon-192.png" alt="" width="72" height="72" />
        <p>KEEP BALI HUB HANDY</p>
        <h2 id="install-dialog-title">Install Bali Hub 2026</h2>
        {appleMobile ? <>
          <ol>
            <li>Tap the browser <strong>Share</strong> button.</li>
            <li>Choose <strong>Add to Home Screen</strong>.</li>
            <li>Tap <strong>Add</strong> to finish.</li>
          </ol>
          <small>If “Add to Home Screen” is unavailable, open this page in Safari and try again.</small>
        </> : <>
          <p className="install-dialog-copy">Use your browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>
          <small>The direct install prompt appears automatically in supported Android and desktop browsers once the site is eligible.</small>
        </>}
        <button className="install-dialog-done" type="button" onClick={() => setInstructionsOpen(false)}>Got it</button>
      </section>
    </div>}
  </>;
}
