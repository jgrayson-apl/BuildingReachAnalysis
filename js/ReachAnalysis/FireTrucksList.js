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

import FireTruckInfo from './FireTruckInfo.js';
import FireTruck from './FireTruck.js';

/**
 *
 * FireTrucksList
 *  - Element: apl-fire-trucks-list
 *  - Description: Fire Trucks List
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  6/15/2022 - 0.0.1 -
 * Modified:
 *
 */

class FireTrucksList extends HTMLElement {

  static version = '0.0.1';

  /**
   * @type {HTMLTemplateElement}
   */
  static ITEM_TEMPLATE;
  static {
    FireTrucksList.ITEM_TEMPLATE = document.createElement('template');
    FireTrucksList.ITEM_TEMPLATE.innerHTML = `
      <calcite-pick-list-item
        label=""
        description=""
        value="">        
      </calcite-pick-list-item> 
    `;
  }

  /**
   * @type {SceneView}
   * @private
   */
  _view;
  set view(value) {
    this._view = value;
  }

  /**
   * @type {FireTruck}
   */
  selectedFireTruck;

  /**
   * @type {Map<string,FireTruckInfo>}
   */
  fireTruckInfosById;

  /**
   *
   */
  constructor() {
    super();

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = `
      <style>
        :host {}      
      </style>
      <calcite-pick-list></calcite-pick-list>  
    `;

  }

  /**
   * <calcite-pick-list-group group-title="Fire Truck Types"></calcite-pick-list-group>
   */
  connectedCallback() {

    this.list = this.shadowRoot.querySelector('calcite-pick-list');
    this.listContainer = this.shadowRoot.querySelector('calcite-pick-list');

  }

  /**
   *
   * @param {FireTruckInfo} fireTruckInfo
   * @param {boolean} selected
   * @returns {HTMLElement}
   */
  createListItem({fireTruckInfo, selected = false}) {
    const templateContent = FireTrucksList.ITEM_TEMPLATE.content.cloneNode(true);

    const listItem = templateContent.querySelector('calcite-pick-list-item');
    listItem.setAttribute('label', fireTruckInfo.label);
    listItem.setAttribute('description', fireTruckInfo.description);
    listItem.setAttribute('value', fireTruckInfo.id);
    listItem.toggleAttribute('selected', selected);

    return listItem;
  }

  /**
   *
   * @param {SceneView} view
   * @param {string} buildingsLayerTitle
   */
  initialize({view, buildingsLayerTitle}) {

    this.view = view;

    // FIRE TRUCK //
    this.selectedFireTruck = new FireTruck({view: this._view, buildingsLayerTitle});
    this.selectedFireTruck.addEventListener('analysis-results', ({detail: {label = '', location, validResultsCount = 0, intersectedCount = 0, visibleCount = 0, obstructedCount = 0}}) => {
      this.dispatchEvent(new CustomEvent('analysis-results', {detail: {label, location, validResultsCount, intersectedCount, visibleCount, obstructedCount}}));
    });

    // LOAD FIRE TRUCK INFOS //
    FireTruckInfo.loadTruckInfos().then(({fireTruckInfos}) => {

      const {fireTruckItems, fireTruckInfosById} = fireTruckInfos.reduce((infos, fireTruckInfo, idx) => {

        if (idx === 0) {
          this.selectedFireTruck.initialize({fireTruckInfo});
        }

        const fireTruckItem = this.createListItem({fireTruckInfo, selected: (idx === 0)});

        infos.fireTruckInfosById.set(fireTruckInfo.id, fireTruckInfo);
        infos.fireTruckItems.push(fireTruckItem);

        return infos;
      }, {fireTruckInfosById: new Map(), fireTruckItems: []});

      // LIST OF FIRE TRUCK TYPES //
      this.listContainer.replaceChildren(...fireTruckItems);

      // FIRE TRUCKS BY ID //
      this.fireTruckInfosById = fireTruckInfosById;

      this.list.addEventListener('calciteListChange', ({detail}) => {
        const truckId = detail.keys().next().value;
        const fireTruckInfo = this.fireTruckInfosById.get(truckId);
        this.selectedFireTruck.setTruckInfo({fireTruckInfo});

        if (this.selectedFireTruck.fireTruckGraphic.geometry) {
          this.sketchViewModel.update(this.selectedFireTruck.fireTruckGraphic);
        }

        this.dispatchEvent(new CustomEvent('truck-type-change', {detail: {fireTruckInfo}}));
      });

      this.initializeFireTruckPlacement();

    });
  }

  /**
   *
   * @param {Point} [location]
   */
  resetSelectedLocation(location) {
    this.selectedFireTruck.setLocation({location: location, action: 'reset'});
    location && this.sketchViewModel.update(this.selectedFireTruck.fireTruckGraphic);
  }

  /**
   *
   */
  initializeFireTruckPlacement() {
    require([
      "esri/core/promiseUtils",
      "esri/widgets/Sketch/SketchViewModel"
    ], (promiseUtils, SketchViewModel) => {

      this.sketchViewModel = new SketchViewModel({
        view: this._view,
        layer: this.selectedFireTruck.fireTrucksLayer,
        defaultUpdateOptions: {
          tool: 'transform',
          multipleSelectionEnabled: false,
          enableZ: false,
          enableScaling: false,
          preserveAspectRatio: true,
          toggleToolOnClick: false
        }
      });

      this.sketchViewModel.on('update', ({toolEventInfo, graphics, state, type, aborted}) => {
        if (!aborted && toolEventInfo) {
          switch (toolEventInfo.type) {
            case 'move-start':
            case 'move':
            case 'move-stop':
              const location = this._view.groundView.elevationSampler.queryElevation(graphics[0].geometry);
              this.selectedFireTruck.setLocation({location, action: toolEventInfo.type});
              break;
            case 'rotate-start':
            case 'rotate':
            case 'rotate-stop':
              this.selectedFireTruck.heading = toolEventInfo.mover.symbol.symbolLayers.items[0].heading;
              break;
          }
        }
      });

    });

  }
}

customElements.define("apl-fire-trucks-list", FireTrucksList);

export default FireTrucksList;
