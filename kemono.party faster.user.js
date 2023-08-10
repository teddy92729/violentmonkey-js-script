// ==UserScript==
// @name        kemono.party faster
// @namespace   Violentmonkey Scripts
// @match       https://kemono.party/*/user/*/post/*
// @version     1.2
// @author      -
// @description 2022/1/31 下午1:08:03
// ==/UserScript==

let style=document.createElement("style");
style.innerText=`
  .pageNum{
    height:22px;
    width:100%;
    background:#E6E6E6;
    margin:30px 0px;
    font:bold 18px Arial;
    color:black;
    text-align:center;
    display:block;
  }
`;
document.head.appendChild(style);

let file=document.querySelectorAll("a.fileThumb.image-link");
let imgLinks=[];
for(let f of file){
  let href=f.href.split("/").slice(3).join("/");
  imgLinks.push(href);
}
// console.log(imgLinks);


let server=[]
for(let index of Array(6).keys()){
  server.push(`https://c${index+1}.kemono.party/`);
}


complete=Array(6).fill(null);
const getServer=function(){
  let id=Math.floor(Math.random()*server.length);
  if(!complete[id]||complete[id].complete){
    return id;
  }
  return null;
}


file=document.querySelector("div.post__files");
file.innerHTML="";

let len=document.createElement("div");
len.className="pageNum";
len.innerText="length="+imgLinks.length;
file.appendChild(len);

let id=setInterval((function(){
  let imgC=0;
  return function(){
    let serverId=getServer();
    if(imgC>=imgLinks.length){
      clearInterval(id);
      let done=document.createElement("div");
      done.innerText="done";
      done.className="pageNum";
      file.appendChild(done);
      return;
    }else if(serverId!=null){
      let d=document.createElement("div");
      d.innerText=imgC;
      d.className="pageNum";
      file.appendChild(d);

      let img=document.createElement("img");
      img.src=server[serverId]+imgLinks[imgC];
      complete[serverId]=img;
      file.appendChild(img);
      imgC+=1;
    }
  }
})(),200);
