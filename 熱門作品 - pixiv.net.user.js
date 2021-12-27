// ==UserScript==
// @name        熱門作品 - pixiv.net
// @namespace   Violentmonkey Scripts
// @match       http*://www.pixiv.net/*
// @grant       none
// @version     1.0
// @author      -
// @description 2021/12/25 下午3:47:33
// ==/UserScript==
const pixivReloadEvent=new CustomEvent("pixivReload");//定義pixiv跳轉頁面事件
const DEBUG=false;
//覆寫pushState函式，以觸發跳轉頁面事件
var pushState=window.history.pushState;
window.history.pushState=(...args)=>{
  document.dispatchEvent(pixivReloadEvent);
  return pushState.apply(window.history,args);
}

//等待所求元素生成
function waitForElement(element,selector,func,update=100,limit=Infinity){
  return new Promise((r,rj)=>{
    var id=setInterval(()=>{
    if(limit--){
      if(DEBUG)console.log("searching");
      if(DEBUG)console.log("limit:",limit);
      var select=element.querySelectorAll(selector);
      if(select===null||select.length==0||!func(select))return;
      if(DEBUG)console.log("ok");
      clearInterval(id);
      r(select);
    }else{
      if(DEBUG)console.log("failed");
      clearInterval(id);
    }
  },update)});
}

var writing=0;//鎖定寫入
function main(e){
  if(/tags\/\S*\/artworks(\?p=\d*)?/.test(window.location.href) ){//確定網址格式為搜尋圖片
    waitForElement(document.querySelector("#root"),"[href$=\"/premium/lead/lp?g=anchor&i=popular_works_list&p=free_campaign&page=visitor\"]",(s)=>{
      //驗證所求元素&其子元素已生成
      if(DEBUG)console.log("testing");
      try{
        var a=s[0];
        var aside=a.previousSibling;
        aside.querySelector("ul").dataset;
        aside.querySelector("a").dataset;
        aside.querySelector("img").dataset;
        return true;
      }catch{
        return false;
      }
    },100,30).then(async(s)=>{
      if(writing){
        if(DEBUG)console.log("writing!");
        return;
      }
      writing=1;
      var a=s[0];//取得熱門作品上跳轉premium連結
      a.style.display="none";//隱藏premium連結
      var aside=a.previousSibling;
      var ul=aside.querySelector("ul");//取得熱門作品容器
      var div=ul.nextSibling;
      div.style.display="none";//隱藏premium介紹文字
      var btn=div.nextSibling;
      btn.style.display="none";//隱藏premium按鈕
      
      var template=ul.children[0].cloneNode(true);//複製熱門作品元素格式樣本
      var new_li=function(userId,artworksId,alt,src){//依據樣本寫入所需元素
        var clone=template.cloneNode(true);
        var clone_a=clone.querySelector("a");
        clone_a.dataset.gtmUserId=userId;
        clone_a.dataset.gtmValue =artworksId;
        clone_a.href="/artworks/"+artworksId;
        var clone_img=clone.querySelector("img");
        clone_img.alt=alt;
        clone_img.title=alt;
        clone_img.src=src;
        return clone;
      }
      
      var searchTags=window.location.href.split("/");
      searchTags=searchTags[searchTags.length-2];//取得搜尋文字
      //透過api取得搜尋內容
      var data=await fetch("https://www.pixiv.net/ajax/search/artworks/"+searchTags).then((response)=>{
        return response.json();
      });
      
      //提出熱門作品
      var popular=data["body"]["popular"];
      popular=[].concat(popular["permanent"],popular["recent"]);//將不同分類的熱門作品混在一起
      
      //隱藏熱門作品容器預設元素
      if(document.head.querySelector("#displayNone")==null){
        var css=document.createElement("style");
        css.innerText="."+ul.children[0].className.split(" ").pop()+`{
          display:none;
        }`;
        css.id="displayNone";
        document.head.appendChild(css);  
      }
      
      ul.style.flexWrap="wrap";//分段排列
      ul.style.webkitMask="unset";//移除熱門作品上漸暗效果
      
      //移除先前生成元素
      for(var v of ul.querySelectorAll(".popularAppend")){
        v.remove();
      }
      
      for(var v of popular){
        var li=new_li(v.userId,v.id,v.alt,v.url);//生成熱門作品元素
        li.style.marginLeft="0px";//移除預設寬度
        li.style.flexBasis="9.75%";//9個作品為一行
        li.style.margin="8px";//設置邊框
        li.className="popularAppend";//移除所有class
        ul.appendChild(li);
      }
      if(DEBUG)console.log(popular);
      // ul.style.width=112*popular.length+"px";
      // ul.parentNode.parentNode.parentNode.style.width=112*popular.length+8+"px";
      writing=0;
    }).catch((s)=>{
      
    });
  }
}


document.addEventListener("pixivReload",main);//觸發pixiv跳轉事件
main();//第一次載入