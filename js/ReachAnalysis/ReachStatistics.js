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
 * ReachStatistics
 *  - Reach Statistics
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  7/15/2022 - 0.0.1 -
 * Modified:
 *
 */

class ReachStatistics extends EventTarget {

  static version = '0.0.1';

  /**
   *
   * @type {SceneView} view
   */
  view;

  /**
   *
   * @param {SceneView} view
   */
  constructor({view}) {
    super();

    this.view = view;

    this.initializeLayer();

  }

  /**
   *
   */
  initializeLayer() {
    require(["esri/layers/FeatureLayer"], (FeatureLayer) => {

      const colors = [
        "rgba(25, 43, 51, 0.5)",
        "rgba(64, 184, 156, 0.6)",
        "rgba(78, 230, 194, 0.7)",
        "rgba(102, 255, 219, 1)",
        "rgba(158, 255, 233, 1)"
      ];

      const featureReduction = {
        type: "binning",
        fields: [
          {
            name: "avg_visibility",
            outStatistic: {
              onStatisticField: "visible",
              statisticType: "avg"
            }
          }
        ],
        fixedBinLevel: 9,
        labelsVisible: true,
        labelingInfo: [
          {
            minScale: 1000,
            maxScale: 0,
            deconflictionStrategy: "none",
            symbol: {
              type: "text",
              color: "#242424",
              font: {
                family: "Avenir Next LT Pro",
                size: 8
              }
            },
            labelExpressionInfo: {
              expression: "Round($feature.avg_visibility)"
            }
          }
        ],
        renderer: {
          type: "simple",
          symbol: {
            type: "simple-fill",
            color: '#ffffff',
            outline: {
              color: "rgba(255, 255, 255, 0.1)",
              width: 0.3
            }
          },
          visualVariables: [
            {
              type: "color",
              field: "avg_visibility",
              legendOptions: {
                title: "Average Visibility"
              },
              stops: [
                {value: 0, color: colors[0]},
                {value: 15, color: colors[1]},
                {value: 30, color: colors[2]},
                {value: 60, color: colors[3]},
                {value: 90, color: colors[4]}
              ]
            }
          ]
        }
      };

      const simpleRenderer = {
        type: "simple",
        symbol: {
          type: "simple-marker",
          color: 'white',
          outline: {color: "red", width: 0.8}
        }
      };

      this.reachStatisticLayer = new FeatureLayer({
        title: "Reach Statistics",
        elevationInfo: {mode: 'on-the-ground'},
        fields: [
          {
            name: "ObjectID",
            alias: "ObjectID",
            type: "oid"
          },
          {
            name: "visible",
            alias: "Visible Count",
            type: "integer"
          }
        ],
        objectIdField: "ObjectID",
        geometryType: "point",
        spatialReference: this.view.spatialReference,
        source: [],
        opacity: 0.8,
        featureReduction,
        renderer: simpleRenderer
      });
      this.view.map.add(this.reachStatisticLayer);

    });
  }

  /**
   *
   */
  clearLocationStatistics() {
    this.reachStatisticLayer.queryFeatures().then(allFS => {
      if (allFS.features.length) {
        this.reachStatisticLayer.applyEdits({deleteFeatures: allFS.features}).then(({deleteFeatureResults}) => {
          console.assert(deleteFeatureResults.every(result => result.error == null), deleteFeatureResults);
        });
      }
    });
  }

  /**
   *
   * @param location
   * @param count
   */
  addLocationStatistic({location, count}) {
    location.hasZ = false;
    this.reachStatisticLayer.applyEdits({
      addFeatures: [{geometry: location, attributes: {visible: count}}]
    }).then(({addFeatureResults}) => {
      console.assert(addFeatureResults[0].error == null, addFeatureResults[0].error);
    });
  }

}

export default ReachStatistics;
