// ==UserScript==
// @name        Anime4k - youtube.com
// @namespace   Violentmonkey Scripts
// @match       https://www.youtube.com/*
// @grant       none
// @version     1.1
// @author      teddy92729
// @description 2022/2/3 下午8:42:30
// ==/UserScript==
(async()=>{
  var vid=document.querySelector("video");
  while(!vid)await new Promise(r=>setTimeout(()=>{
    vid=document.querySelector("video");
    r();
  },200));
  
  vid.id="vid";
  vid.style.visibility="hidden";/*"unset"*/
  var canv=document.createElement("canvas");
  canv.id="canv";
  vid.parentNode.insertBefore(canv,vid);
  
  const bundleSrc="https://teddy92729.github.io/ani-ss/dist/bundle.js";
  var bundle=document.createElement("script");
  bundle.src=bundleSrc;
  document.head.appendChild(bundle);
  
  
  document.addEventListener("anime4kReady", ()=>{
    var shader=document.createElement("script");
    shader.id="shader";
    shader.src="https://teddy92729.github.io/ani-ss/dist/shader.x2D.D.js";
    document.head.appendChild(shader);
  });
  
  canv.className="video-stream";
  const canvResize=function(){
    canv.style.width=vid.style.width;
    canv.style.height=vid.style.height;
    canv.style.left=vid.style.left;
    canv.style.top=vid.style.top;  
    console.log("canv resize");
  }
  
  vid.addEventListener("loadeddata",canvResize);
  var resizeM=new MutationObserver (canvResize);
  resizeM.observe(vid,{attributes:true});
  
})();
