/*
 Copyright 2022 Esri

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
/**
 *
 * Slides
 *  - Element: apl-slides
 *  - Description: Slides Widget
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  7/5/2022 - 0.0.1 -
 * Modified:
 *
 */

class Slides extends HTMLElement {

  static version = '0.0.1';

  /**
   * @type {SceneView}
   */
  _view;

  /**
   * @type {string}
   */
  _webSceneId;

  /**
   * @type {boolean}
   */
  _displayThumbnails;

  /**
   *
   * @param {SceneView|null} [view]
   * @param {string|null} [webSceneId]
   * @param {boolean|null} [displayThumbnails]
   */
  constructor({view, webSceneId = null, displayThumbnails = true}) {
    super();

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = `
      <style>
        :host {         
          color: var(--calcite-ui-brand);
          background-color: var(--calcite-ui-foreground-1) !important;          
        }  
        
        :host calcite-list {
          width: 180px;
          height: auto;
        }
        
        :host calcite-list:empty {
          content: 'No Slides Available';
        }
        
        :host calcite-list-item img {
            padding: 5px;
            height: 44px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
        
      </style>
      <calcite-list></calcite-list>     
    `;

    this._view = view;
    this._webSceneId = webSceneId || this.getAttribute('webSceneId');
    this._displayThumbnails = displayThumbnails || this.getAttribute('displayThumbnails');

  }

  /**
   *
   */
  connectedCallback() {

    this.list = this.shadowRoot.querySelector('calcite-list');

    if (this._view) {
      this._createSlidesFromWebScene({webScene: this._view.map});
    } else {
      if (this._webSceneId) {
        this._getSlidesFromItem({webSceneId: this._webSceneId});
      }
    }
  }

  /**
   *
   * @param {string} webSceneId
   * @private
   */
  _getSlidesFromItem({webSceneId}) {
    require(['esri/WebScene'], (WebScene) => {
      const webScene = new WebScene({portalItem: {id: webSceneId}});
      this._createSlidesFromWebScene({webScene});
    });
  }

  /**
   *
   * @param {WebScene} webScene
   * @private
   */
  _createSlidesFromWebScene({webScene}) {
    webScene.load().then(() => {
      this._createSlideListItems({slides: webScene.presentation.slides});
    });
  }

  /**
   *
   * @private
   */
  _createSlideListItems({slides}) {

    const slideListItems = slides.map(slide => {
      const slideListItem = document.createElement('calcite-list-item');
      slideListItem.setAttribute('label', slide.title.text);

      const slideThumb = document.createElement('img');
      slideThumb.setAttribute('slot', 'content-start');
      slideThumb.setAttribute('src', slide.thumbnail.url);
      slideThumb.toggleAttribute('hidden', !this._displayThumbnails);
      slideListItem.append(slideThumb);

      slideListItem.addEventListener('click', () => {
        this._view.goTo({target: slide.viewpoint});
      });

      return slideListItem;
    });
    slideListItems.length && this.list.replaceChildren(...slideListItems);

  }

}

customElements.define("apl-slides", Slides);

export default Slides;
