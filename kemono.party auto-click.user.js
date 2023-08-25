// ==UserScript==
// @name        kemono.party auto-click
// @namespace   Violentmonkey Scripts
// @match       https://kemono.party/*/user/*/post/*
// @version     1.3
// @author      -
// @run-at      document-end
// @description 2022/1/31 下午1:08:03
// ==/UserScript==
let files = document.querySelectorAll("a.fileThumb.image-link");

(async () => {
    let loading_counter = 0;
    const loading_counter_max = 3;
    for (let i = 0; i < files.length; ++i) {
        while (loading_counter >= loading_counter_max) {
            await new Promise(r=>setTimeout(()=>r(),200));
        }
        files[i].firstElementChild.click();
        files[i].lastElementChild.addEventListener("load", () => --loading_counter);
        ++loading_counter;
    }
})();
