/*
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import {ResolveUrl} from './resolve-url.js';


const MODULE_STYLE_LINK_SELECTOR = 'link[rel=import][type~=css]';
const INCLUDE_ATTR = 'include';

interface Module extends Element {
  _cssText: string|null;
  assetpath: string;
}

declare namespace Polymer {
  var DomModule: {
    import(moduleId: string): Module;
  } | undefined;
}

function importModule(moduleId: string) {
  if (!Polymer.DomModule) {
    return null;
  }
  return Polymer.DomModule.import(moduleId);
}

/**
 * Module with utilities for collection CSS text from `<templates>`, external
 * stylesheets, and `dom-module`s.
 *
 * @namespace
 * @memberof Polymer
 * @summary Module with utilities for collection CSS text from various sources.
 */
export const StyleGather = {

  /**
   * Returns CSS text of styles in a space-separated list of `dom-module`s.
   *
   * @memberof Polymer.StyleGather
   * @param {string} moduleIds List of dom-module id's within which to
   * search for css.
   * @return {string} Concatenated CSS content from specified `dom-module`s
   */
  cssFromModules(moduleIds: string): string {
    let modules = moduleIds.trim().split(' ');
    let cssText = '';
    for (let i=0; i < modules.length; i++) {
      cssText += this.cssFromModule(modules[i]);
    }
    return cssText;
  },

  /**
   * Returns CSS text of styles in a given `dom-module`.  CSS in a `dom-module`
   * can come either from `<style>`s within the first `<template>`, or else
   * from one or more `<link rel="import" type="css">` links outside the
   * template.
   *
   * Any `<styles>` processed are removed from their original location.
   *
   * @memberof Polymer.StyleGather
   * @param {string} moduleId dom-module id to gather styles from
   * @return {string} Concatenated CSS content from specified `dom-module`
   */
  cssFromModule(moduleId: string): string {
    let m = importModule(moduleId);
    if (m && m._cssText === undefined) {
      let cssText = '';
      // include css from the first template in the module
      let t = m.querySelector('template');
      if (t) {
        cssText += this.cssFromTemplate(t, m.assetpath);
      }
      // module imports: <link rel="import" type="css">
      cssText += this.cssFromModuleImports(moduleId);
      m._cssText = cssText || null;
    }
    if (!m) {
      console.warn('Could not find style data in module named', moduleId);
    }
    return m && m._cssText || '';
  },

  /**
   * Returns CSS text of `<styles>` within a given template.
   *
   * Any `<styles>` processed are removed from their original location.
   *
   * @memberof Polymer.StyleGather
   * @param {HTMLTemplateElement} template Template to gather styles from
   * @param {string} baseURI Base URI to resolve the URL against
   * @return {string} Concatenated CSS content from specified template
   */
  cssFromTemplate(template: HTMLTemplateElement, baseURI: string): string {
    let cssText = '';
    // if element is a template, get content from its .content
    let e$ = template.content.querySelectorAll('style');
    for (let i=0; i < e$.length; i++) {
      let e = e$[i];
      // support style sharing by allowing styles to "include"
      // other dom-modules that contain styling
      let include = e.getAttribute(INCLUDE_ATTR);
      if (include) {
        cssText += this.cssFromModules(include);
      }
      e.parentNode!.removeChild(e);
      cssText += baseURI ?
        ResolveUrl.resolveCss(e.textContent!, baseURI) : e.textContent;
    }
    return cssText;
  },

  /**
   * Returns CSS text from stylsheets loaded via `<link rel="import" type="css">`
   * links within the specified `dom-module`.
   *
   * @memberof Polymer.StyleGather
   * @param {string} moduleId Id of `dom-module` to gather CSS from
   * @return {string} Concatenated CSS content from links in specified `dom-module`
   */
  cssFromModuleImports(moduleId: string) {
    let cssText = '';
    let m = importModule(moduleId);
    if (!m) {
      return cssText;
    }
    let p$ = m.querySelectorAll(MODULE_STYLE_LINK_SELECTOR) as any as HTMLLinkElement[];
    for (let i=0; i < p$.length; i++) {
      let p = p$[i];
      if (p.import) {
        let importDoc = p.import;
        // NOTE: polyfill affordance.
        // under the HTMLImports polyfill, there will be no 'body',
        // but the import pseudo-doc can be used directly.
        let container = importDoc.body ? importDoc.body : importDoc;
        cssText +=
          ResolveUrl.resolveCss(container.textContent!,
            importDoc.baseURI!);
      }
    }
    return cssText;
  }
};
