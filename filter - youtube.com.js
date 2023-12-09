// ==UserScript==
// @name        filter - youtube.com
// @namespace   Violentmonkey Scripts
// @match       https://www.youtube.com/*
// @grant       none
// @version     1.0
// @author      HYTeddy
// @run-at      document-start
// @require      https://teddy92729.github.io/tool.js
// @description 2023/12/7 上午3:37:19
// ==/UserScript==

const settings = {
    "blockAds": true,
    "skipAds": true,
    "blockComments": false,
    "blockShorts": false,
    "tryFix": false,
    "prunePlayer": false,
    "advanced": {
        "skipAdsWaitTime": 200,
        "skipAdsClickTime": 200,
        "tryFixLazyLoadTime": 2000,
        "logPrefix": "[filter - youtube.com]",
    }
};

let log = console.log.bind(console, settings.advanced.logPrefix);

(() => {
    "use strict";

    //apply css style
    (() => {
        let blockList = [];
        if (settings.blockComments) {
            blockList.push("#comments");
        }
        if (settings.blockAds) {
            blockList.push("#player-ads");
            blockList.push("ytd-ad-slot-renderer", "ytd-rich-item-renderer:has(ytd-ad-slot-renderer)");
            blockList.push(".masthead-ad-control,.ad-div,.pyv-afc-ads-container");
            blockList.push(`masthead-ad`);
            blockList.push("[ads-semantic-text]");
            blockList.push(".ytd-rich-grid-renderer > ytd-rich-section-renderer:has(ytd-statement-banner-renderer)");
        }
        //hide element in blockList
        addCssDisplayNoneAlt(...blockList);

        blockList = [];
        if (settings.blockShorts) {
            blockList.push("ytd-reel-shelf-renderer");
            blockList.push("[is-shorts]");
        }
        if (settings.prunePlayer) {
            // remove div unless bottom bar, right click menu and video
            // blockList.push("#movie_player > div:not(:has(video), .ytp-chrome-bottom, .ytp-contextmenu, .ytp-miniplayer-ui)");
            // remove div unless bottom bar and video
            blockList.push("#movie_player > div:not(:has(video), .ytp-chrome-bottom, .ytp-miniplayer-ui)");
        }
        //hide element in blockList
        addCssDisplayNone(...blockList);

        if (settings.tryFix) {
            addCss(`
                #primary {
                    max-width: unset !important;
                }
            `);
            let hiddenLoaing = () => {
                addCss(`
                    #columns, #contents {
                        display: none !important;
                    }
                `).then((css) =>
                    after(settings.advanced.tryFixLazyLoadTime)
                        .then(() => css.remove())
                );
            };
            hiddenLoaing();
            window.addEventListener("yt-navigate-start", hiddenLoaing);
        }
    })();


    // skip playing ads
    (() => {
        if (!settings.skipAds) return;

        let blockAds = () => {
            log("waiting ads")
            elementCreated(".ytp-ad-player-overlay")
                .then(() =>
                    elementCreated(".ytp-ad-skip-button-slot", settings.advanced.skipAdsClickTime)
                        .then((button) => {
                            log("click skip ads");
                            button.click();
                        })
                        .catch(() => {
                            log("no click ads");
                            return elementCreated("video").then(waitVideoLoaded).then((video) => {
                                video.currentTime = video.duration;
                            });
                        })
                ).finally(() => {
                    after(settings.advanced.skipAdsWaitTime).then(blockAds);
                });
        }
        after(settings.advanced.skipAdsWaitTime).then(blockAds);
    })();
})();
