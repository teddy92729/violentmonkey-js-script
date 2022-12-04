// ==UserScript==
// @name        anime4k_Deblur_DoG - test
// @namespace   Violentmonkey Scripts
// @match       https://*/*.mp4
// @grant       none
// @version     1.0
// @author      -
// @require     https://teddy92729.github.io/elementCreated.js
// @require     https://pixijs.download/release/pixi.js
// @description 2022/11/28 下午5:26:55
// ==/UserScript==

function getVideoCanvas(videoElement){
  return new Promise(async(r0)=>{
    (new Promise(async (r1)=>{
      const video=(typeof videoElement === "string")?(await elementCreated(videoElement)):videoElement;
      if(video.readyState===4)
        r1(video);
      else
        video.addEventListener("loadedmetadata",()=>{r1(video)});
    })).then((video)=>{

      const width=video.videoWidth;
      const height=video.videoHeight;

      let render = new PIXI.Renderer({ width: width, height: height });
      let canvas= render.view;
      var stage = new PIXI.Container();

      let sprite = PIXI.Sprite.from(video);
      stage.addChild(sprite);

      let update=(function update_init(){
        return function(){
          let $this = video;
          if (!$this.paused && !$this.ended) {
            render.render(stage);
            requestAnimationFrame(update);
          }
        }
      })();

      video.parentNode.insertBefore(canvas,video.nextSibling);

      canvas.height=height;
      canvas.width =width;
      canvas.className+=` ${video.className}`;
      canvas.style.position="absolute";
      canvas.style.top="50%";
      canvas.style.left="50%";
      canvas.style.transform="translate(-50%, -50%)";
      canvas.style.height="100%";
      canvas.style.width="unset";

      video.addEventListener("play",update);
      update();
      r0([video,stage]);
    });
  });
}

let anime4k_deblur_dog_frag=`
precision highp float;
varying vec2 vTextureCoord;
uniform vec4 inputSize;
uniform sampler2D uSampler;
//-------------------------------------------
#define HOOKED_pos      vTextureCoord
#define HOOKED_tex(pos) texture2D(uSampler, pos)
#define HOOKED_pt       1.0/inputSize.xy

float get_luma(vec4 rgba) {
	return dot(vec4(0.299, 0.587, 0.114, 0.0), rgba);
}

vec4 LINELUMA_tex(vec2 pos){
    return vec4(get_luma(HOOKED_tex(pos)), 0.0, 0.0, 0.0);
}
//------------------------------------------

#define L_tex LINELUMA_tex

float max3v(float a, float b, float c) {
	return max(max(a, b), c);
}
float min3v(float a, float b, float c) {
	return min(min(a, b), c);
}

vec2 minmax3(vec2 pos, vec2 d) {
	float a = L_tex(pos - d).x;
	float b = L_tex(pos).x;
	float c = L_tex(pos + d).x;

	return vec2(min3v(a, b, c), max3v(a, b, c));
}

float lumGaussian7(vec2 pos, vec2 d) {
	float g = (L_tex(pos - (d + d)).x + L_tex(pos + (d + d)).x) * 0.06136;
	g = g + (L_tex(pos - d).x + L_tex(pos + d).x) * 0.24477;
	g = g + (L_tex(pos).x) * 0.38774;

	return g;
}


vec4 MMKERNEL_tex(vec2 pos) {
    return vec4(lumGaussian7(pos, vec2(HOOKED_pt.x, 0.0)), minmax3(pos, vec2(HOOKED_pt.x, 0.0)), 0.0);
}
//-------------------------------------------------
#undef L_tex
#define L_tex MMKERNEL_tex


vec2 minmax3_y(vec2 pos, vec2 d) {
	float a0 = L_tex(pos - d).y;
	float b0 = L_tex(pos).y;
	float c0 = L_tex(pos + d).y;

	float a1 = L_tex(pos - d).z;
	float b1 = L_tex(pos).z;
	float c1 = L_tex(pos + d).z;

	return vec2(min3v(a0, b0, c0), max3v(a1, b1, c1));
}

float lumGaussian7_y(vec2 pos, vec2 d) {
	float g = (L_tex(pos - (d + d)).x + L_tex(pos + (d + d)).x) * 0.06136;
	g = g + (L_tex(pos - d).x + L_tex(pos + d).x) * 0.24477;
	g = g + (L_tex(pos).x) * 0.38774;

	return g;
}


vec4 MMKERNEL_y_tex(vec2 pos) {
    return vec4(lumGaussian7_y(pos, vec2(0.0, HOOKED_pt.y)), minmax3_y(pos, vec2(0.0, HOOKED_pt.y)), 0.0);
}
//-------------------------------------------------
#define STRENGTH 0.6 //De-blur proportional strength, higher is sharper. However, it is better to tweak BLUR_CURVE instead to avoid ringing.
#define BLUR_CURVE 0.6 //De-blur power curve, lower is sharper. Good values are between 0.3 - 1. Values greater than 1 softens the image;
#define BLUR_THRESHOLD 0.1 //Value where curve kicks in, used to not de-blur already sharp edges. Only de-blur values that fall below this threshold.
#define NOISE_THRESHOLD 0.001 //Value where curve stops, used to not sharpen noise. Only de-blur values that fall above this threshold.
#undef L_tex
#define L_tex LINELUMA_tex

vec4 Apply_tex(vec2 pos) {
	float c = (L_tex(pos).x - MMKERNEL_y_tex(pos).x) * STRENGTH;

	float t_range = BLUR_THRESHOLD - NOISE_THRESHOLD;

	float c_t = abs(c);
	if (c_t > NOISE_THRESHOLD) {
		c_t = (c_t - NOISE_THRESHOLD) / t_range;
		c_t = pow(c_t, BLUR_CURVE);
		c_t = c_t * t_range + NOISE_THRESHOLD;
		c_t = c_t * sign(c);
	} else {
		c_t = c;
	}

	float cc = clamp(c_t + L_tex(pos).x, MMKERNEL_y_tex(pos).y, MMKERNEL_y_tex(pos).z) - L_tex(pos).x;

	//This trick is only possible if the inverse Y->RGB matrix has 1 for every row... (which is the case for BT.709)
	//Otherwise we would need to convert RGB to YUV, modify Y then convert back to RGB.
	return HOOKED_tex(pos) + cc;
}
//-------------------------------------------------
void main(){
    gl_FragColor=Apply_tex(HOOKED_pos);
}
`;



getVideoCanvas("video").then(([video,stage])=>{
  let noiseFilter=new PIXI.filters.NoiseFilter();
  noiseFilter.noise=0.05;

  let anime4k_deblur_dog = new PIXI.Filter(null, anime4k_deblur_dog_frag);
  console.log(video,stage,anime4k_deblur_dog);
  document.body.addEventListener("keydown",(e)=>{
    if(e&&(e.code==="KeyI")){
      anime4k_deblur_dog.enabled=!anime4k_deblur_dog.enabled;
      console.log(anime4k_deblur_dog.enabled);
    }
  });

  stage.filters=[anime4k_deblur_dog,noiseFilter];
});
