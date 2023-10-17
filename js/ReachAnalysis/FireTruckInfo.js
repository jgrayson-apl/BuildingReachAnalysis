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
 * FireTruckInfo
 *  - Fire Truck Type
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  6/14/2022 - 0.0.1 -
 * Modified:
 *
 */

class FireTruckInfo {

  static version = '0.0.1';

  static TRUCK_TYPES = {
    'Aerial_Ladder_Pumper': {
      id: 'Aerial_Ladder_Pumper',
      label: 'Pumper - Single Rear Axle',
      description: 'Reach: 75 ft | Range: 3° to 78°',
      unit: 'feet',
      unitFactor: 0.3048,
      width: 8.33,
      height: 12.5,
      depth: 40.0,
      ladderReach: 75.0,
      jackSpread: 11.0,
      range: [3, 78]
    },
    'Aerial_Ladder_Tanker': {
      id: 'Aerial_Ladder_Tanker',
      label: 'Tanker - Tandem Rear Axle',
      description: 'Reach: 105 ft | Range: 5° to 75°',
      unit: 'feet',
      unitFactor: 0.3048,
      width: 8.33,
      height: 12.5,
      depth: 43.0,
      ladderReach: 105.0,
      jackSpread: 16.0,
      range: [5, 75]
    },
    'Aerial_Ladder': {
      id: 'Aerial_Ladder',
      label: 'Tiller Single & Tandem Rear Tractor Axle',
      description: 'Reach: 125 ft | Range: 5° to 68°',
      unit: 'feet',
      unitFactor: 0.3048,
      width: 8.33,
      height: 11.5,
      depth: 63.0,
      ladderReach: 125.0,
      jackSpread: 17.0,
      range: [5, 68]
    }
  };

  /**
   * @type {string}
   */
  id;

  /**
   * @type {string}
   */
  label;

  /**
   * @type {string}
   */
  description;

  /**
   * @type {string}
   */
  unit;

  /**
   * @type {number}
   */
  unitFactor;

  /**
   * @type {number}
   */
  width;

  /**
   * @type {number}
   */
  height;

  /**
   * @type {number}
   */
  depth;

  /**
   * @type {number}
   */
  ladderReach;

  /**
   * @type {number}
   */
  ladderOffset;

  /**
   * @type {number}
   */
  jackSpread;

  /**
   *
   * @type {number[]}
   */
  range;

  /**
   *
   * @type {PointSymbol3D}
   */
  fireTruckSymbol;

  /**
   *
   * @type {number}
   */
  defaultHeading = 90.0;

  /**
   *
   * @type {PolygonSymbol3D}
   */
  jackSpreadSymbol;

  /**
   *
   * @param {string} truckTypeId
   */
  constructor({truckTypeId}) {

    Object.assign(this, FireTruckInfo.TRUCK_TYPES[truckTypeId]);

    //
    // ADJUST SIZES TO METERS //
    //
    this.width = (this.width * this.unitFactor);
    this.height = (this.height * this.unitFactor);
    this.depth = (this.depth * this.unitFactor);
    this.ladderReach = (this.ladderReach * this.unitFactor);
    this.jackSpread = (this.jackSpread * this.unitFactor);

    this.ladderOffset = this.depth * (0.35 * 0.5);

  }

  /**
   * https://developers.arcgis.com/javascript/latest/api-reference/esri-symbols-FillSymbol3DLayer.html#material
   *
   * @returns {Promise<>}
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      require(["esri/symbols/WebStyleSymbol"], (WebStyleSymbol) => {

        this.jackSpreadSymbol = {
          type: "polygon-3d",
          symbolLayers: [
            {
              type: "fill",
              material: {color: 'transparent'},
              outline: {
                color: '#b32931',
                size: 5.0,
                pattern: {type: "style", style: "dash"}
              },
              pattern: {type: "style", style: "diagonal-cross"}
            }
          ]
        };

        const webSymbol = new WebStyleSymbol({
          name: "Firetruck",
          styleName: "EsriRealisticTransportationStyle"
        });
        webSymbol.fetchSymbol().then((fireTruckSymbol) => {

          this.fireTruckSymbol = fireTruckSymbol.clone();
          this.fireTruckSymbol = this.getFireTruckSymbol({heading: this.defaultHeading});

          /*require(["esri/geometry/Mesh"], (Mesh) => {
            this.getTargets = ({observer}) => {
              const targetSphere = Mesh.createSphere(observer, {
                densificationFactor: 1,
                size: (this.ladderReach * 2.0),
                unit: 'meters'
              }).centerAt(observer);
              return Array.from(targetSphere.vertexAttributes.position);
            };
          });*/

          resolve(this);
        });
      });
    });

  }

  /**
   *
   * @param {number} heading
   * @returns {PointSymbol3D}
   */
  getFireTruckSymbol({heading}) {

    const fireTruckSymbol = this.fireTruckSymbol.clone();

    const objSymbolLayer = fireTruckSymbol.symbolLayers.getItemAt(0);
    objSymbolLayer.set({
      heading: heading,
      width: this.width,
      height: this.height,
      depth: this.depth,
      anchor: 'relative',
      anchorPosition: {x: 0.0, y: -0.35, z: 0.5}
    });

    return fireTruckSymbol;
  }

  /**
   *
   * @returns {Promise<{fireTruckTypes:FireTruckInfo[]}>}
   */
  static loadTruckInfos() {
    return new Promise((resolve, reject) => {

      const loadHandles = [];
      for (let truckTypeId in FireTruckInfo.TRUCK_TYPES) {
        const fireTruckInfo = new FireTruckInfo({truckTypeId});
        loadHandles.push(fireTruckInfo.initialize());
      }

      Promise.all(loadHandles).then((fireTruckInfos) => {
        resolve({fireTruckInfos});
      });

    });
  }

}

export default FireTruckInfo;
