// ==UserScript==
// @name        anime4k_Deblur_DoG - test
// @namespace   Violentmonkey Scripts
// @match       *://*/*.mp4
// @match       *://*/*.webm
// @match       https://sn-video.com/video2019/index.php?data=*
// @match       https://ani.gamer.com.tw/animeVideo.php?sn=*
// @match       https://www.youtube.com/*
// @grant       none
// @version     2.4
// @author      HYTeddy
// @require     https://teddy92729.github.io/elementCreated.js
// @require     https://pixijs.download/v7.3.2/pixi.js
// @description 2022/11/28 下午5:26:55
// ==/UserScript==

// MIT License

// Copyright (c) 2019-2021
// All rights reserved.

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

const anime4k_deblur_dog_frag = `
precision highp float;
varying vec2 vTextureCoord;
uniform vec4 inputSize;
uniform sampler2D uSampler;
//-------------------------------------------
#define HOOKED_pos      vTextureCoord
#define HOOKED_tex(pos) texture2D(uSampler, pos)
#define HOOKED_pt       inputSize.zw

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
#define NOISE_THRESHOLD 0.01 //Value where curve stops, used to not sharpen noise. Only de-blur values that fall above this threshold.
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
const vertex =
    `#version 300 es
in vec2 aVertexPosition;
uniform mat3 projectionMatrix;
out vec2 vTextureCoord;

uniform vec4 inputSize;
uniform vec4 outputFrame;

vec4 filterVertexPosition( void ){
    vec2 position = aVertexPosition * max(outputFrame.zw, vec2(0.)) + outputFrame.xy;

    return vec4((projectionMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);
}

vec2 filterTextureCoord( void ){
    return aVertexPosition * (outputFrame.zw * inputSize.zw);
}

void main(void){
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`;

const cartoon_frag =
    `#version 300 es
precision highp float;
in vec2 vTextureCoord;
uniform vec4 inputSize;
uniform sampler2D uSampler;
uniform sampler2D Orginal;
out vec4 color;
//-------------------------------------------
#define MAIN_pos      vTextureCoord
#define MAIN_tex(pos) texture(uSampler, pos)
#define Orginal_tex(pos) texture(Orginal, pos)
#define MAIN_pt       inputSize.zw
#define MAIN_texOff(offset) MAIN_tex(MAIN_pos+(offset)*MAIN_pt)
//-------------------------------------------
#define EdgeSlope 2.0
#define Power     0.1
float get_luma(vec4 rgba) {
	return dot(vec4(0.299, 0.587, 0.114, 0.0), rgba);
}
vec4 hook() {
    float diff1=get_luma(MAIN_texOff(vec2(1,1)));
    diff1=get_luma(MAIN_texOff(vec2(-1,-1)))-diff1;
    float diff2=get_luma(MAIN_texOff(vec2(1,-1)));
    diff2=get_luma(MAIN_texOff(vec2(-1,1)))-diff2;
    float edge=diff1*diff1+diff2+diff2;
    return clamp(pow(abs(edge), EdgeSlope) * -Power + MAIN_tex(MAIN_pos),0.0,1.0);
}
void main(){
    color=hook();
}
`;
const cas_frag =
    `#version 300 es
precision highp float;
in vec2 vTextureCoord;
uniform vec4 inputSize;
uniform sampler2D uSampler;
uniform sampler2D Orginal;
out vec4 color;
//-------------------------------------------
#define MAIN_pos      vTextureCoord
#define MAIN_tex(pos) texture(uSampler, pos)
#define Orginal_tex(pos) texture(Orginal, pos)
#define MAIN_pt       inputSize.zw
#define MAIN_texOff(offset) MAIN_tex(MAIN_pos+(offset)*MAIN_pt)
//-------------------------------------------
#define Contrast    0.5
#define Sharpening  0.5
vec4 cas(){
  vec3 b = MAIN_texOff(vec2( 0,-1)).rgb;
  vec3 d = MAIN_texOff(vec2(-1, 0)).rgb;

  vec3 e = MAIN_texOff(vec2(0,0)).rgb;
  vec3 f = MAIN_texOff(vec2(1,0)).rgb;

  vec3 h = MAIN_texOff(vec2(0,1)).rgb;
  vec3 i = MAIN_texOff(vec2(1,1)).rgb;

  vec3 g = MAIN_texOff(vec2(-1, 1)).rgb;
	vec3 a = MAIN_texOff(vec2(-1,-1)).rgb;
	vec3 c = MAIN_texOff(vec2( 1,-1)).rgb;

  vec3 mnRGB = min(min(min(d, e), min(f, b)), h);
	vec3 mnRGB2 = min(mnRGB, min(min(a, c), min(g, i)));
	mnRGB += mnRGB2;

  vec3 mxRGB = max(max(max(d, e), max(f, b)), h);
  vec3 mxRGB2 = max(mxRGB, max(max(a, c), max(g, i)));
	mxRGB += mxRGB2;


  vec3 rcpMRGB = 1.0/mxRGB;
	vec3 ampRGB = clamp(min(mnRGB, 2.0 - mxRGB) * rcpMRGB,0.0,1.0);

  ampRGB = 1.0/sqrt(ampRGB);

  float peak = -3.0 * Contrast + 8.0;
	vec3 wRGB = -1.0/(ampRGB * peak);

	vec3 rcpWeightRGB = 1.0/(4.0 * wRGB + 1.0);

	vec3 window = (b + d) + (f + h);
	vec3 outColor = clamp((window * wRGB + e) * rcpWeightRGB,0.0,1.0);

	return vec4(mix(e, outColor, Sharpening),1.0);
}

void main(){
    color=cas();
}
`;
//https://github.com/byxor/thug-pro-reshade/blob/master/THUG%20Pro/reshade-shaders/Shaders/FakeHDR.fx
const hdr_frag =
    `#version 300 es
precision highp float;
in vec2 vTextureCoord;
uniform vec4 inputSize;
uniform sampler2D uSampler;
uniform sampler2D Orginal;
out vec4 color;
//-------------------------------------------
#define MAIN_pos      vTextureCoord
#define MAIN_tex(pos) texture(uSampler, pos)
#define Orginal_tex(pos) texture(Orginal, pos)
#define MAIN_pt       inputSize.zw
#define MAIN_texOff(offset) MAIN_tex(MAIN_pos+(offset)*MAIN_pt)
//-------------------------------------------

#define HDRPower 1.3
#define radius1 7.475000
#define radius2 7.547000
vec4 hook(){
	vec3 _color = MAIN_tex(MAIN_pos).rgb;

	vec3 bloom_sum1 = MAIN_texOff(vec2(1.5, -1.5) * radius1 ).rgb;
	bloom_sum1 += MAIN_texOff(vec2(-1.5, -1.5) * radius1 ).rgb;
	bloom_sum1 += MAIN_texOff(vec2( 1.5,  1.5) * radius1 ).rgb;
	bloom_sum1 += MAIN_texOff(vec2(-1.5,  1.5) * radius1 ).rgb;
	bloom_sum1 += MAIN_texOff(vec2( 0.0, -2.5) * radius1 ).rgb;
	bloom_sum1 += MAIN_texOff(vec2( 0.0,  2.5) * radius1 ).rgb;
	bloom_sum1 += MAIN_texOff(vec2(-2.5,  0.0) * radius1 ).rgb;
	bloom_sum1 += MAIN_texOff(vec2( 2.5,  0.0) * radius1 ).rgb;

	bloom_sum1 *= 0.005;

	vec3 bloom_sum2 = MAIN_texOff(vec2(1.5, -1.5) * radius2 ).rgb;
	bloom_sum2 += MAIN_texOff(vec2(-1.5, -1.5) * radius2 ).rgb;
	bloom_sum2 += MAIN_texOff(vec2( 1.5,  1.5) * radius2 ).rgb;
	bloom_sum2 += MAIN_texOff(vec2(-1.5,  1.5) * radius2 ).rgb;
	bloom_sum2 += MAIN_texOff(vec2( 0.0, -2.5) * radius2 ).rgb;
	bloom_sum2 += MAIN_texOff(vec2( 0.0,  2.5) * radius2 ).rgb;
	bloom_sum2 += MAIN_texOff(vec2(-2.5,  0.0) * radius2 ).rgb;
	bloom_sum2 += MAIN_texOff(vec2( 2.5,  0.0) * radius2 ).rgb;

	bloom_sum2 *= 0.010;

	float dist = radius2 - radius1;
	vec3 HDR = (_color + (bloom_sum2 - bloom_sum1)) * dist;
	vec3 blend = HDR + _color;
	_color = pow(abs(blend), abs(vec3(HDRPower, HDRPower, HDRPower))) - HDR; // pow - don't use fractions for HDRpower

	return vec4(clamp(_color, 0.0, 1.0), 1.0);
}

void main(){
    color=hook();
}
`;

const line_frag =
    `#version 300 es
precision highp float;
in vec2 vTextureCoord;
uniform vec4 inputSize;
uniform sampler2D uSampler;
uniform sampler2D Orginal;
out vec4 color;
//-------------------------------------------
#define MAIN_pos      vTextureCoord
#define MAIN_tex(pos) texture(uSampler, pos)
#define Orginal_tex(pos) texture(Orginal, pos)
#define MAIN_pt       inputSize.zw
#define MAIN_texOff(offset) MAIN_tex(MAIN_pos+(offset)*MAIN_pt)
//-------------------------------------------
#define Power     1.0

float get_luma(vec3 rgb) {
	return dot(vec3(0.299, 0.587, 0.114), rgb);
}

vec4 hook() {
    float diff1=-dot(normalize(MAIN_texOff(vec2(1,1))),normalize(MAIN_texOff(vec2(1,1))))+1.0;
    float diff2=-dot(normalize(MAIN_texOff(vec2(-1,1))),normalize(MAIN_texOff(vec2(1,-1))))+1.0;
    float edge=diff1*diff1+diff2+diff2;
    vec3 c=MAIN_tex(MAIN_pos).rgb;
    float luma=get_luma(c);
    edge = clamp(edge*Power,-luma*0.1,luma*0.1);

    return vec4(c+edge,1.0);
    //return clamp(vec4(edge,edge,edge,1.0),0.0,1.0);
}
void main(){
    color=hook();
}
`;
const splitRGB_frag =
    `#version 300 es
precision highp float;
in vec2 vTextureCoord;
uniform vec4 inputSize;
uniform sampler2D uSampler;
uniform sampler2D Orginal;
uniform float strength;
out vec4 color;
//-------------------------------------------
#define MAIN_pos      vTextureCoord
#define MAIN_tex(pos) texture(uSampler, pos)
#define Orginal_tex(pos) texture(Orginal, pos)
#define MAIN_pt       inputSize.zw
#define MAIN_texOff(offset) MAIN_tex(MAIN_pos+(offset)*MAIN_pt)
//-------------------------------------------

#define RSplit vec2(-1.0, 1.0)*strength
#define GSplit vec2( 1.0,-1.0)*strength
#define BSplit vec2( 0.0, 0.0)*strength

vec4 hook() {
//  float diff_r=0.6-dot(normalize(MAIN_tex(MAIN_pos)),normalize(MAIN_texOff(RSplit)));
//  float diff_g=0.6-dot(normalize(MAIN_tex(MAIN_pos)),normalize(MAIN_texOff(GSplit)));
//  float diff_b=0.6-dot(normalize(MAIN_tex(MAIN_pos)),normalize(MAIN_texOff(BSplit)));
//  return vec4(MAIN_texOff(RSplit*diff_r).r,MAIN_texOff(GSplit*diff_g).g,MAIN_texOff(BSplit*diff_b).b,1.0);
    return vec4(MAIN_texOff(RSplit).r,MAIN_texOff(GSplit).g,MAIN_texOff(BSplit).b,1.0);
}
void main() {
    color = hook();
}
`;

const Anime4K_3DGraphics_AA_Upscale_x2_US_frag1 =
    `#version 300 es
precision highp float;
in vec2 vTextureCoord;
uniform vec4 inputSize;
uniform sampler2D uSampler;
uniform sampler2D Orginal;
out vec4 color;
//-------------------------------------------
#define MAIN_pos      vTextureCoord
#define MAIN_tex(pos) texture(uSampler, pos)
#define Orginal_tex(pos) texture(Orginal, pos)
#define MAIN_pt       inputSize.zw
#define MAIN_size       inputSize.xy
#define MAIN_texOff(offset) MAIN_tex(MAIN_pos+(offset)*MAIN_pt)
//-------------------------------------------

#define go_0(x_off, y_off) (MAIN_texOff(vec2(x_off, y_off)))
vec4 hook() {
    vec4 result = mat4(0.10005958, 0.30363804, -0.24045889, -0.003466652, 0.25860623, 0.47408342, -0.58965975, 0.058167808, 0.17228158, 0.43657768, -0.3982826, -0.022539442, 0.0, 0.0, 0.0, 0.0) * go_0(-1.0, -1.0);
    result += mat4(-0.23593923, 0.4692322, 0.04355681, 0.009586428, -0.37485301, 0.5885971, 0.3236714, -0.08301241, -0.3188667, 0.5608897, 0.3396368, 0.059106056, 0.0, 0.0, 0.0, 0.0) * go_0(-1.0, 0.0);
    result += mat4(-0.15485556, -0.11745722, 0.042440087, 0.5313071, -0.24682014, 0.00033858762, -0.08202063, 0.84100145, -0.15803772, -0.11368423, -0.09765383, 0.6991758, 0.0, 0.0, 0.0, 0.0) * go_0(-1.0, 1.0);
    result += mat4(0.21323937, 0.07442176, -0.10949712, -0.05313448, 0.44871446, 0.16815953, 0.07202329, -0.05763504, 0.12998791, 0.06934043, 0.044557367, -0.00978054, 0.0, 0.0, 0.0, 0.0) * go_0(0.0, -1.0);
    result += mat4(0.40295616, -0.7156766, 0.7321813, -0.54544497, 0.44781828, -1.1244348, 0.7786728, -0.91297877, 0.52567977, -0.81486106, 0.56867415, -0.68681335, 0.0, 0.0, 0.0, 0.0) * go_0(0.0, 0.0);
    result += mat4(0.020084642, -0.072761856, -0.13040084, 0.063976064, 0.18822637, -0.096821584, -0.06842927, 0.18078656, 0.05295053, -0.18540566, -0.1239999, 0.0156137515, 0.0, 0.0, 0.0, 0.0) * go_0(0.0, 1.0);
    result += mat4(-0.6254935, 0.0074730455, 0.21930416, 0.028796878, -0.82789946, 0.051125027, 0.25597844, 0.049207535, -0.68400925, -0.015768895, 0.233402, 0.021760475, 0.0, 0.0, 0.0, 0.0) * go_0(1.0, -1.0);
    result += mat4(0.21823564, -0.15992375, -0.14845636, -0.031485636, 0.13821888, -0.27466524, -0.094343, -0.07067512, 0.20875643, -0.20346795, -0.12910774, -0.052383807, 0.0, 0.0, 0.0, 0.0) * go_0(1.0, 0.0);
    result += mat4(0.001368614, 0.17603171, -0.36661625, -0.0043979343, 0.1381601, 0.27952382, -0.6743216, 0.0067374213, -0.023204552, 0.21662682, -0.3795221, -0.025739884, 0.0, 0.0, 0.0, 0.0) * go_0(1.0, 1.0);
    result += vec4(0.025272772, 0.014345055, -0.009859513, 0.000597734);
    return result;
}

void main() {
    color = hook();
}
`;
const Anime4K_3DGraphics_AA_Upscale_x2_US_frag2 =
    `#version 300 es
precision highp float;
in vec2 vTextureCoord;
uniform vec4 inputSize;
uniform sampler2D uSampler;
uniform sampler2D Orginal;
out vec4 color;
//-------------------------------------------
#define MAIN_pos      vTextureCoord
#define MAIN_tex(pos) texture(uSampler, pos)
#define Orginal_tex(pos) texture(Orginal, pos)
#define MAIN_pt       inputSize.zw
#define MAIN_size       inputSize.xy
#define MAIN_texOff(offset) MAIN_tex(MAIN_pos+(offset)*MAIN_pt)
//-------------------------------------------

#define go_0(x_off, y_off) (max((MAIN_texOff(vec2(x_off, y_off))), 0.0))
#define go_1(x_off, y_off) (max(-(MAIN_texOff(vec2(x_off, y_off))), 0.0))
vec4 hook() {
    vec4 result = mat4(-0.08796357, 0.028130328, 0.073414765, -0.029320398, -0.07826724, 0.012752971, 0.06304871, 0.082551956, -0.052348416, 0.010077275, 0.0803755, 0.16395038, -0.08238233, -0.0012038432, -0.1297045, -0.1087021) * go_0(-1.0, -1.0);
    result += mat4(0.044162463, -0.019727755, -0.05845153, -0.23984948, 0.08363732, -0.06774037, 0.0234879, 0.02139741, 0.0028723166, -0.07549135, 0.0744662, 0.109019615, 0.03763121, -0.060664024, -0.03823593, -0.015655363) * go_0(-1.0, 0.0);
    result += mat4(-0.026882887, 0.124355234, -0.005225512, 0.053853527, -0.004761375, 0.07739831, 0.007993726, -0.024238527, -0.035357814, 0.022114292, -0.026158875, 0.047122046, -0.021067293, 0.041959677, 0.008588816, -0.006613815) * go_0(-1.0, 1.0);
    result += mat4(-0.037601672, 0.010898833, 0.05053419, -0.0118405875, 0.052177202, 0.013291429, -0.20246609, -0.07192325, -0.05164381, -0.011278074, -0.12394048, -0.037769064, 0.24392918, 0.03289724, 0.018663784, 0.04071627) * go_0(0.0, -1.0);
    result += mat4(-0.17768572, -0.003431817, 0.024597375, -0.067222916, -0.15119793, -0.049984362, 0.0588867, 0.20031504, -0.028296817, -0.17337173, 0.02136566, 0.07842319, -0.10203611, 0.02128208, 0.20057699, 0.026265312) * go_0(0.0, 0.0);
    result += mat4(-0.018206367, -0.36731398, -0.07842714, -0.08946319, 0.05601789, -0.13398123, -0.09766525, 0.0051633804, -0.004821273, -0.060362365, -0.08751827, -0.01924666, -0.01642196, -0.084792316, -0.021546558, -0.01531331) * go_0(0.0, 1.0);
    result += mat4(-0.003315341, 0.003464535, 0.023609636, -0.029517155, 0.023121882, -0.033598952, 0.032658506, 0.072380014, 0.038630765, -0.020992903, -0.09003304, 0.048244834, 0.17752261, -0.023978172, 0.7178278, 0.09461632) * go_0(1.0, -1.0);
    result += mat4(0.010277829, -0.0462686, -0.024897251, -0.02214524, 0.1262903, -0.15583614, -0.50100106, -0.04074772, 0.0612536, -0.17066137, -0.15715116, -0.020877155, -0.062031068, 0.4314311, -0.008700501, -0.030722365) * go_0(1.0, 0.0);
    result += mat4(-0.12062004, 0.055291675, 0.041176047, -0.034254536, -0.04062085, 0.14750236, 0.100433215, 0.024384778, -0.02506444, -0.0012329774, 0.06715311, 0.013158619, -0.07343181, 0.08929479, 0.015891392, 0.0014893904) * go_0(1.0, 1.0);
    result += mat4(-0.00028356185, 0.008408778, 0.046833538, -0.110735945, 0.050230157, -0.023995856, -0.06471944, -0.12666705, 0.121487044, -0.040447604, -0.13425831, -0.035763647, 0.06327994, 0.04542948, 0.12984566, 0.041735172) * go_1(-1.0, -1.0);
    result += mat4(-0.09654193, 0.055733874, 0.14149562, 0.20103204, -0.04256184, 0.041129943, -0.0997907, 0.030775042, 0.017492702, 0.053436417, -0.13472094, -0.037674613, -0.09461306, 0.07363193, 0.025130237, -0.020962669) * go_1(-1.0, 0.0);
    result += mat4(0.003966979, -0.077911004, -0.025530541, -0.08657802, 0.047928706, -0.12820454, -0.034780253, 0.070523396, 0.0991259, -0.07432318, -0.035848588, 0.026542934, -0.005886989, -0.048655648, 0.014799456, -0.033676937) * go_1(-1.0, 1.0);
    result += mat4(0.0040423325, 0.011639387, 0.014709128, -0.100935176, -0.03094238, -0.0058094636, 0.1256023, 0.086693585, -0.00840243, -0.02635784, -0.2395783, 0.0055595445, -0.104565054, 0.05285065, 0.092289336, 0.12696597) * go_1(0.0, -1.0);
    result += mat4(-0.097862415, 0.035469674, -0.12026435, -0.25865972, 0.12508512, -0.00648921, -0.1848096, -0.24143967, -0.009432349, -0.035211377, -0.05589267, -0.11565712, 0.015937572, 0.02717122, -0.09954979, -0.081140056) * go_1(0.0, 0.0);
    result += mat4(-0.09073428, 0.31426015, 0.087145604, -0.00073830306, 0.013578701, 0.032616604, 0.038264107, 0.07236385, -0.012257218, 0.040580798, 0.08520396, 0.004167174, 0.02280993, 0.113494344, 0.027510444, 0.029490784) * go_1(0.0, 1.0);
    result += mat4(-0.02391937, 0.0039571812, -0.026116686, -0.025334306, 0.06904104, 0.011511556, -0.14147542, 0.01224604, 0.03788813, -0.041387778, -0.1523622, 0.03650455, 0.04693732, 0.03091366, 0.2839756, 0.1779714) * go_1(1.0, -1.0);
    result += mat4(-0.026292996, 0.020397607, 0.09354275, 0.00044126343, -0.047845, 0.11368384, 0.18426466, 0.12002076, -0.034070846, 0.042704806, -0.041553736, 0.04446022, -0.006331844, 0.16227855, 0.07832003, -0.07068554) * go_1(1.0, 0.0);
    result += mat4(-0.026658786, -0.0079359505, -0.04125044, -0.10622727, 0.06254047, -0.36537018, -0.10755624, 0.011665703, 0.025558028, -0.087151, -0.06987865, 0.00023839885, 0.03247968, -0.053188834, -0.004876301, -0.06005079) * go_1(1.0, 1.0);
    result += vec4(-0.012601902, -0.0121468, -0.027073797, -0.0223602);
    return result;
}

void main() {
    color = hook();
}
`;
const Anime4K_3DGraphics_AA_Upscale_x2_US_frag3 =
    `#version 300 es
precision highp float;
in vec2 vTextureCoord;
uniform vec4 inputSize;
uniform sampler2D uSampler;
uniform sampler2D Orginal;
out vec4 color;
//-------------------------------------------
#define MAIN_pos      vTextureCoord
#define MAIN_tex(pos) texture(uSampler, pos)
#define Orginal_tex(pos) texture(Orginal, pos)
#define MAIN_pt       inputSize.zw
#define MAIN_size       inputSize.xy
#define MAIN_texOff(offset) MAIN_tex(MAIN_pos+(offset)*MAIN_pt)
//-------------------------------------------

#define go_0(x_off, y_off) (max((MAIN_texOff(vec2(x_off, y_off))), 0.0))
vec4 hook() {
    vec4 result = mat4(-0.00055252935, 0.0011350953, -0.0016148019, 0.0014946404, -0.30635214, -0.017596753, -0.0036547943, 0.016236471, 0.005174489, 0.0030302007, 0.00019672248, 0.0006430973, 0.0007490077, -0.0031795658, -6.158733e-05, 0.0006820584) * go_0(-1.0, -1.0);
    result += mat4(0.15602079, 0.011071071, -0.0027609533, -0.0034318874, -0.0039016667, 0.016504101, -0.27816474, -0.008282344, 0.19063498, 0.012465078, 0.010091085, -0.004841106, -0.11758087, -0.012808949, 0.0067606894, 0.005216566) * go_0(-1.0, 0.0);
    result += mat4(0.013258877, -0.014989483, 0.22402754, 0.013204027, 0.00016207264, -0.00042593342, -0.00333761, -0.0012207513, 0.0033727325, -0.007841196, 0.16044731, 0.00594871, -0.0028581345, 0.012616562, -0.15928285, -0.011812331) * go_0(-1.0, 1.0);
    result += mat4(-0.0048872055, -0.0011780986, -0.0029523429, 0.00082424335, -0.0024385185, -0.26525813, 0.013532772, -0.0008381766, 0.0024996721, 0.0022899017, -0.0017697349, -0.0010618394, 0.0024938583, 0.005421073, 0.0028740794, -0.007808829) * go_0(0.0, -1.0);
    result += mat4(-0.08293415, 0.2659366, -0.010839574, 0.023423964, 0.01725351, -0.009252893, -0.011632222, -0.308242, 0.0001496815, 0.16104282, -0.0069378703, 0.00842848, 0.085917845, -0.18407243, -0.006601597, -0.027134055) * go_0(0.0, 0.0);
    result += mat4(-0.033873428, -0.011743531, -0.230377, 0.116242796, -0.0018527015, -0.00853698, 0.0059901997, -0.006155517, -0.009841329, 0.006163952, 0.014816026, 0.18667653, 0.016977048, -0.0017093032, 0.19695279, -0.061764043) * go_0(0.0, 1.0);
    result += mat4(-0.0003514533, -0.0069080726, 0.0052108583, -0.0016346197, -0.0016860099, 0.006002445, -0.0022835485, -0.0028219873, 0.0005367275, 0.0005437954, 0.00059865275, -0.00014915364, -0.0032214937, -0.00052043283, -0.0031621973, 0.0055843857) * go_0(1.0, -1.0);
    result += mat4(-0.006905302, -0.20389622, 0.01891904, -0.018114902, 0.00724176, 0.011335843, -0.0028616642, 0.016452003, -0.00013852821, -0.00039706306, 0.0011838446, 0.0028873065, 0.012857878, 0.16889338, -0.014114007, 0.009388666) * go_0(1.0, 0.0);
    result += mat4(0.0040798862, 0.002933288, -0.016012201, -0.14650294, -0.0017411204, 0.0017980475, 0.00056705566, -0.0003218331, -0.0014291195, -0.0062614805, 0.00082543516, -0.00397049, -0.004496662, 0.0008032309, 0.0049529593, 0.117166765) * go_0(1.0, 1.0);
    result += vec4(-3.1127936e-05, 3.3726166e-05, 4.8580805e-05, -9.541029e-06);
    return result;
}

void main() {
    color = hook();
}
`;
const Anime4K_3DGraphics_AA_Upscale_x2_US_frag4 =
    `#version 300 es
precision highp float;
in vec2 vTextureCoord;
uniform vec4 inputSize;
uniform sampler2D uSampler;
uniform sampler2D Orginal;
out vec4 color;
//-------------------------------------------
#define MAIN_pos      vTextureCoord
#define MAIN_tex(pos) texture(uSampler, pos)
#define Orginal_tex(pos) texture(Orginal, pos)
#define MAIN_pt       inputSize.zw
#define MAIN_size       inputSize.xy
#define MAIN_texOff(offset) MAIN_tex(MAIN_pos+(offset)*MAIN_pt)
//-------------------------------------------

#define STRENGTH 1.0

vec4 hook() {
    vec2 f0 = fract(MAIN_pos * MAIN_size);
    ivec2 i0 = ivec2(f0 * vec2(2.0,2.0));
    float c0 = MAIN_tex((vec2(0.5,1.5) - f0) * MAIN_pt + MAIN_pos)[i0.y * 2 + i0.x];
    float c1 = c0;
    float c2 = c1;
    float c3 = c2;
    return vec4(c0, c1, c2, c3) *STRENGTH + Orginal_tex(MAIN_pos);
}

void main() {
    color = hook();
}
`;
const test_frag =//use to deband
    `#version 300 es
precision highp float;
in vec2 vTextureCoord;
uniform vec4 inputSize;
uniform sampler2D uSampler;
uniform sampler2D Orginal;
out vec4 color;
//-------------------------------------------
#define MAIN_pos      vTextureCoord
#define MAIN_tex(pos) texture(uSampler, pos)
#define Orginal_tex(pos) texture(Orginal, pos)
#define MAIN_pt       inputSize.zw
#define MAIN_size       inputSize.xy
#define MAIN_texOff(offset) MAIN_tex(MAIN_pos+(offset)*MAIN_pt)
//-------------------------------------------

#define power 1.0
#define range 3.0
float get_luma(vec3 rgb) {
	return dot(vec3(0.299, 0.587, 0.114), rgb);
}


vec4 hook() {
    vec3 c=MAIN_tex(MAIN_pos).rgb;
    vec3 bezier1=vec3(0.0),bezier2=vec3(0.0);
    float p[6]=float[6](
      1.0,5.0,10.0,10.0,5.0,1.0
    );

    int i;
    //vetical
    for(i=-3;i<0;++i)
      bezier1+=p[i+3]*MAIN_texOff(vec2(0,i)*range).rgb;
    for(i=1;i<=3;++i)
      bezier1+=p[i+2]*MAIN_texOff(vec2(0,i)*range).rgb;
    bezier1/=32.0;

    //horizenal
    for(i=-3;i<0;++i)
      bezier2+=p[i+3]*MAIN_texOff(vec2(i,0)*range).rgb;
    for(i=1;i<=3;++i)
      bezier2+=p[i+2]*MAIN_texOff(vec2(i,0)*range).rgb;
    bezier2/=32.0;

    //The closer the colors are, the blurrier they are.
    bezier1=mix(c,bezier1,pow(2.718,-abs(get_luma(150.0/power*(bezier1-c)))));
    bezier2=mix(c,bezier2,pow(2.718,-abs(get_luma(150.0/power*(bezier2-c)))));
    c=bezier1+bezier2-c;
    return vec4(c,1.0);

}

void main() {
    color = hook();
}
`;

//https://github.com/crosire/reshade-shaders/blob/slim/Shaders/Deband.fx
const deband_frag =
    `#version 300 es
precision highp float;
in vec2 vTextureCoord;
uniform vec4 inputSize;
uniform sampler2D uSampler;
uniform sampler2D Orginal;
out vec4 color;
//-------------------------------------------
#define MAIN_pos      vTextureCoord
#define MAIN_tex(pos) texture(uSampler, pos)
#define Orginal_tex(pos) texture(Orginal, pos)
#define MAIN_pt       inputSize.zw
#define MAIN_size       inputSize.xy
#define MAIN_texOff(offset) MAIN_tex(MAIN_pos+(offset)*MAIN_pt)
//-------------------------------------------

const bool enable_weber = true;

const bool enable_sdeviation = true;

const float t1 = 0.007;

const float t2 = 0.04;

const float range = 24.0;

const int iterations = 4;

// Reshade uses C rand for random, max cannot be larger than 2^15-1


float rand(float x){
    return fract(x / 41.0);
}

float mod289(float x)  { return x - floor(x / 289.0) * 289.0; }
float permute(float x){
    return mod289((34.0 * x + 1.0) * x);
}

vec4 hook(){
    vec3 ori = MAIN_tex(MAIN_pos).rgb;
    float drandom = floor(fract(sin(dot(MAIN_pos, vec2(12.9898, 78.233))) * 43758.5453) * 32768.0);
    // Initialize the PRNG by hashing the position + a random uniform
    vec3 m = vec3(MAIN_pos + 1.0, (drandom / 32767.0) + 1.0);
    float h = permute(permute(permute(m.x) + m.y) + m.z);

    // Compute a random angle
    float dir  = rand(permute(h)) * 6.2831853;
    vec2 o = vec2(sin(dir),cos(dir));

    // Distance calculations
    vec2 pt;
    float dist;

    for (int i = 1; i <= iterations; ++i) {
        dist = rand(h) * range * float(i);
        pt = dist * MAIN_size;

        h = permute(h);
    }

    // Sample at quarter-turn intervals around the source pixel
    vec3 ref[4] = vec3[4](
        MAIN_texOff(o).rgb, // SE
        MAIN_texOff(-o).rgb, // NW
        MAIN_texOff(vec2(-o.y,o.x)).rgb, // NE
        MAIN_texOff(vec2(o.y,-o.x)).rgb  // SW
    );

    // Calculate weber ratio
    vec3 mean = (ori + ref[0] + ref[1] + ref[2] + ref[3]) * 0.2;
    vec3 k = abs(ori - mean);
    for (int j = 0; j < 4; ++j) {
        k += abs(ref[j] - mean);
    }

    k = k * 0.2 / mean;

    // Calculate std. deviation
    vec3 sd = vec3(0.0);

    for (int j = 0; j < 4; ++j) {
        sd += pow(ref[j] - ori, vec3(2.0));
    }

    sd = sqrt(sd * 0.25);

    // Generate final output
    vec3 outputFrame = (ref[0] + ref[1] + ref[2] + ref[3]) * 0.25;

    // Generate a binary banding map
    bvec3 banding_map = bvec3(true);

    if (enable_weber)
        banding_map = bvec3(banding_map[0] && k[0] <= t2 * float(iterations), banding_map[1] && k[1] <= t2 * float(iterations),banding_map[2] && k[2] <= t2 * float(iterations));

    if (enable_sdeviation)
        banding_map = bvec3(banding_map[0] && sd[0] <= t1 * float(iterations),banding_map[1] && sd[1] <= t1 * float(iterations),banding_map[2] && sd[2] <= t1 * float(iterations));

	/*------------------------.
	| :: Ordered Dithering :: |
	'------------------------*/
	//Calculate grid position
	float grid_position = fract(dot(MAIN_pos, (MAIN_size * vec2(1.0 / 16.0, 10.0 / 36.0)) + 0.25));

	//Calculate how big the shift should be
	float dither_shift = 0.25 * (1.0 / (pow(2.0, 24.0) - 1.0));

	//Shift the individual colors differently, thus making it even harder to see the dithering pattern
	vec3 dither_shift_RGB = vec3(dither_shift, -dither_shift, dither_shift); //subpixel dithering

	//modify shift acording to grid position.
	dither_shift_RGB = mix(2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position); //shift acording to grid position.

  return vec4(outputFrame + dither_shift_RGB ,1.0);
}
void main() {
    color = hook();
}
`;
function getVideoCanvas(videoElement) {
    return new Promise((resolve) => {
        if (!(videoElement instanceof HTMLVideoElement)) throw new Error("getVideoCanvas: invalid arguments");

        const video = videoElement;
        // check video is ready.
        if (video.readyState > 0)
            resolve(video);
        else
            video.addEventListener("loadedmetadata", () => { resolve(video) });
    }).then((video) => {
        // create canvas with PIXI.autoDetectRenderer
        let renderer = PIXI.autoDetectRenderer({});
        let canvas = renderer.view;
        // cover canvas on video and set video invisible
        video.parentNode.insertBefore(canvas, video.nextSibling);
        video.style.visibility = "hidden";
        //create texture from video
        let stage = new PIXI.Container();
        let texture = PIXI.Texture.from(video);
        let sprite = new PIXI.Sprite(texture);
        stage.addChild(sprite);

        //resize canvas when video changed size
        let resize = () => {
            setTimeout(() => {
                let style = window.getComputedStyle(video, null);

                canvas.style.position = "absolute";
                canvas.style.display = "block";
                canvas.style.margin = "auto";
                canvas.style.top = (style.top === "auto") ? "0px" : style.top;
                canvas.style.bottom = (style.bottom === "auto") ? "0px" : style.bottom;
                canvas.style.left = (style.left === "auto") ? "0px" : style.left;
                canvas.style.right = (style.right === "auto") ? "0px" : style.right;

                if (parseInt(style.width.replace("px", "")) / video.videoWidth >= parseInt(style.height.replace("px", "")) / video.videoHeight) {
                    canvas.style.height = style.height;
                    canvas.style.width = "unset";
                } else {
                    canvas.style.height = "unset";
                    canvas.style.width = style.width;
                }

                let scale = Math.min(2, 3110400 / (video.videoWidth * video.videoHeight));
                let width = Math.ceil(scale * video.videoWidth);
                let height = Math.ceil(scale * video.videoHeight);
                // console.log(`${video.videoWidth}x${video.videoHeight}=>${width}x${height}`);
                sprite.width = width;
                sprite.height = height;
                renderer.resize(width, height);
            }, 100);
        }
        resize();
        (new ResizeObserver(resize)).observe(video);
        // video.addEventListener("resize", resize);
        video.addEventListener("progress", resize);

        let anime4k_deblur_dog = new PIXI.Filter(null, anime4k_deblur_dog_frag);
        let cartoon = new PIXI.Filter(vertex, cartoon_frag);
        let cas = new PIXI.Filter(vertex, cas_frag);
        let hdr = new PIXI.Filter(vertex, hdr_frag);
        let noiseFilter = new PIXI.filters.NoiseFilter();
        noiseFilter.noise = 0.02;
        let line = new PIXI.Filter(vertex, line_frag);
        let splitRGB = new PIXI.Filter(vertex, splitRGB_frag, { strength: 1.0 });
        let rsplitRGB = new PIXI.Filter(vertex, splitRGB_frag, { strength: -1.0 });
        let fxaa = new PIXI.filters.FXAAFilter();
        let Anime4K_3DGraphics_AA_Upscale_x2_US1 = new PIXI.Filter(vertex, Anime4K_3DGraphics_AA_Upscale_x2_US_frag1);
        let Anime4K_3DGraphics_AA_Upscale_x2_US2 = new PIXI.Filter(vertex, Anime4K_3DGraphics_AA_Upscale_x2_US_frag2);
        let Anime4K_3DGraphics_AA_Upscale_x2_US3 = new PIXI.Filter(vertex, Anime4K_3DGraphics_AA_Upscale_x2_US_frag3);
        let Anime4K_3DGraphics_AA_Upscale_x2_US4 = new PIXI.Filter(vertex, Anime4K_3DGraphics_AA_Upscale_x2_US_frag4, { Orginal: texture });
        let deband = new PIXI.Filter(vertex, deband_frag);
        let test = new PIXI.Filter(vertex, test_frag);
        let filters = [
            // test,
            // Anime4K_3DGraphics_AA_Upscale_x2_US1,
            // Anime4K_3DGraphics_AA_Upscale_x2_US2,
            // Anime4K_3DGraphics_AA_Upscale_x2_US3,
            // Anime4K_3DGraphics_AA_Upscale_x2_US4,
            // deband,
            test,
            hdr,
            // cartoon,
            line,
            anime4k_deblur_dog,
            // cas,
            // rsplitRGB,
            // fxaa,
            noiseFilter,
            // test,
            // splitRGB,
        ];
        stage.filters = filters;

        let update_lock = 1;
        let update = () => {
            if (!video.paused && !video.ended && update_lock) {
                update_lock = 0;
                renderer.render(stage);
                video.requestVideoFrameCallback(() => {
                    update_lock = 1;
                });
            }
            window.requestAnimationFrame(update);
        }
        update();
        // video.addEventListener("play", update);
        video.addEventListener("seeked", () => renderer.render(stage));

        document.body.addEventListener("keydown", (e) => {
            if (e && (e.code === "Backquote")) {
                let toggle = !stage.filters[0].enabled;
                for (let i in stage.filters) {
                    stage.filters[i].enabled = toggle;
                }
                renderer.render(stage);
                console.log(toggle);
            }
            // console.log(e,e.code)
        });
        return [video, canvas];
    });
}

(async () => {
    getVideoCanvas(await elementCreated("video")).then(([video, canvas]) => {
        if (window.location.href.match("www\.youtube\.com\/")) {
            let setQuality = async () => {
                // lock video quality to 1080p or highest below
                let ytplayer = await elementCreated("#movie_player");
                let qualities = ytplayer.getAvailableQualityLevels();
                if (qualities.includes("hd1080"))
                    ytplayer.setPlaybackQualityRange("hd1080");
                else
                    ytplayer.setPlaybackQualityRange(qualities[0]);
            };
            setQuality();
            video.addEventListener("resize", setQuality);
        }
    });
})();
