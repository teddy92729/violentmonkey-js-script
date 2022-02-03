/* tslint:disable */
/* eslint-disable */
/**
*/
export class AniSS {
  free(): void;
/**
* @param {WebGL2RenderingContext} gl
*/
  constructor(gl: WebGL2RenderingContext);
/**
*/
  resizeTextures(): void;
/**
* @param {number | undefined} scale
*/
  setScale(scale?: number): void;
/**
* @param {HTMLElement} element
*/
  setSource(element: HTMLElement): void;
/**
* @param {string} program
* @returns {boolean}
*/
  addProgram(program: string): boolean;
/**
* @returns {boolean}
*/
  render(): boolean;
}
/**
* Program struct holds all the info of a single hook.
*/
export class Program {
  free(): void;
}
/**
* ProgramWrapper is a container for a native [WebGlProgram] that has been compiled with the
* correct shaders built using the [Program] struct and [ProgramWrapper::new].
*/
export class ProgramWrapper {
  free(): void;
}
