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
 * BuildingIntersections
 *  - Building Intersections
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  6/20/2022 - 0.0.1 -
 * Modified:
 *
 */

class BuildingIntersections extends EventTarget {

  static version = '0.0.1';

  /**
   * @type {SceneView}
   */
  view;

  /**
   * @type {FeatureLayer}
   */
  buildingsLayer;

  /**
   * @type {Polygon[]}
   */
  nearbyBuildings;

  /**
   * @type {Point}
   */
  observer;

  /**
   * @type {GraphicsLayer}
   */
  buildingIntersectionsLayer;

  get count() {
    return this.buildingIntersectionsLayer?.graphics.length || 0;
  }

  /**
   *
   * @param {SceneView} view
   * @param {string} buildingsLayerTitle
   */
  constructor({view, buildingsLayerTitle}) {
    super();

    // SCENE VIEW //
    this.view = view;

    // BUILDINGS LAYER //
    this.buildingsLayer = this.view.map.layers.find(layer => layer.title === buildingsLayerTitle);

    // RESULTS UTILITIES //
    this.initializeResultsUtils();

    // NEARBY UTILITIES //
    this.initializeNearbyUtils();

  }

  /**
   *
   */
  initializeResultsUtils() {
    require([
      "esri/geometry/Polyline",
      "esri/layers/GraphicsLayer"
    ], (Polyline, GraphicsLayer) => {

      // BUILDING INTERSECTIONS LAYER //
      this.buildingIntersectionsLayer = new GraphicsLayer({
        title: "Building Intersections",
        elevationInfo: {mode: "absolute-height"}
      });
      this.view.map.add(this.buildingIntersectionsLayer);

      const size = 0.5;
      const intersectionSymbol = {
        type: "point-3d",
        symbolLayers: [
          {
            type: "object",
            width: size, height: size, depth: size,
            resource: {primitive: "sphere"},
            material: {color: "#00a118"}
          }
        ]
      };

      const obstructionSymbol = {
        type: "point-3d",
        symbolLayers: [
          {
            type: "object",
            width: size, height: size, depth: size,
            resource: {primitive: "sphere"},
            material: {color: "#b3000f"}
          }
        ]
      };

      const visibleLineSymbol = {
        type: "line-3d",
        symbolLayers: [
          {
            type: "line",
            size: 2.5,
            material: {color: "rgba(59,237,82,0.8)"},
            pattern: {type: "style", style: "solid"}/*,
             marker: {
             type: "style",
             placement: "end",
             color: "#3BEB4F",
             style: "circle"
             }*/
          }
        ]
      };

      const notVisibleLineSymbol = {
        type: "line-3d",
        symbolLayers: [
          {
            type: "line",
            size: 2.0,
            material: {color: "rgba(255,0,21,0.8)"},
            pattern: {type: "style", style: "dash"}/*,
             marker: {
             type: "style",
             placement: "end",
             color: "#D90012",
             style: "circle"
             }*/
          }
        ]
      };

      /**
       *
       * @param {Point} location
       * @returns {Polyline}
       */
      this.createSightLine = (location) => {
        const analysisResultsLine = new Polyline({spatialReference: this.view.spatialReference, hasZ: true});
        analysisResultsLine.addPath([this.observer, location]);
        return analysisResultsLine;
      };

      /**
       *
       * @param symbol
       * @param extend
       * @returns {function(Point): {symbol: *, geometry: Polyline}}
       * @private
       */
      const _createResultGraphic = (symbol, extend = false) => {
        return (intersection) => {
          return {symbol, geometry: extend ? this.createSightLine(intersection) : intersection};
        };
      };

      // CREATE VISIBLE AND OBSTRUCTED GRAPHICS //
      this.createVisibleGraphic = _createResultGraphic(visibleLineSymbol, true);
      this.createObstructedGraphic = _createResultGraphic(notVisibleLineSymbol, true);
      this.createIntersectionGraphic = _createResultGraphic(intersectionSymbol);
      this.createObstructionGraphic = _createResultGraphic(obstructionSymbol);

    });
  }

  /**
   *
   */
  clearIntersections() {
    this.buildingIntersectionsLayer.graphics.removeAll();
  }

  /**
   *
   * @param {Point} observer
   * @param {number} distance
   * @returns {Promise<{nearestBuildings:Polygon[]}>}
   */
  findNearbyBuildings({observer, distance}) {
    return new Promise((resolve, reject) => {
      require(["esri/geometry/Circle"], (Circle) => {

        if (this.buildingsLayer.type === 'scene') {
          // NOTE: LIMITED TESTING...
          // - CAUTION: ONLY WORKS IF THE SCENE LAYER HAS
          //            AN ACCOMPANYING FEATURE LAYER...

          // OBSERVER //
          this.observer = observer.clone();

          const searchArea = new Circle({
            center: this.observer,
            geodesic: true,
            radius: distance,
            radiusUnits: "meters"
          });

          // NEARBY QUERY //
          const nearbyQuery = this.buildingsLayer.createQuery();
          nearbyQuery.set({
            outFields: [],
            geometry: searchArea,
            returnGeometry: true,
            multipatchOption: 'xyFootprint',
            outSpatialReference: this.view.spatialReference
          });
          this.buildingsLayer.queryFeatures(nearbyQuery).then((nearbyFS) => {
            // NEARBY BUILDINGS //
            this.nearbyBuildings = nearbyFS.features.map(feature => this.getBuildingOffset(feature.geometry));
            // HAS NEARBY BUILDINGS //
            resolve({hasNearbyBuildings: (this.nearbyBuildings.length > 0)});
          }).catch(reject);

        } else {

          this.view.whenLayerView(this.buildingsLayer).then((buildingsLayerView) => {

            // OBSERVER //
            this.observer = observer.clone();

            // NEARBY QUERY //
            const nearbyQuery = buildingsLayerView.createQuery();
            nearbyQuery.set({
              outFields: [],
              outSpatialReference: this.view.spatialReference,
              geometry: this.observer,
              distance: distance,
              units: "meters",
              returnGeometry: true
            });
            buildingsLayerView.queryFeatures(nearbyQuery).then((nearbyFS) => {
              // NEARBY BUILDINGS //
              this.nearbyBuildings = nearbyFS.features.map(feature => this.getBuildingOffset(feature.geometry));
              // HAS NEARBY BUILDINGS //
              resolve({hasNearbyBuildings: (this.nearbyBuildings.length > 0)});
            }).catch(reject);

          });

        }

      });
    });

  }

  /**
   *
   * @param {Point[]} intersections
   * @param {Action} action
   * @returns {{visibleCount: number, obstructedCount: number}}
   */
  findIntersections({intersections, action}) {

    const {visible, obstructed} = intersections.reduce((infos, location) => {
      const withinBuilding = this.intersectsNearbyBuilding(location);// this.withinNearbyBuildings(location);
      if (withinBuilding) {
        infos.visible.push(location);
      } else {
        infos.obstructed.push(location);
      }
      return infos;
    }, {visible: [], obstructed: []});

    if (['move-stop', 'reset'].includes(action)) {

      this.buildingIntersectionsLayer.graphics.addMany(visible.map(this.createVisibleGraphic));
      this.buildingIntersectionsLayer.graphics.addMany(obstructed.map(this.createObstructedGraphic));
      this.buildingIntersectionsLayer.graphics.addMany(visible.map(this.createIntersectionGraphic));
      this.buildingIntersectionsLayer.graphics.addMany(obstructed.map(this.createObstructionGraphic));

    }

    return {visibleCount: visible.length, obstructedCount: obstructed.length};
  }

  /**
   *
   */
  initializeNearbyUtils() {
    require([
      "esri/geometry/geometryEngine",
      "esri/geometry/Polyline"
    ], (geometryEngine, Polyline) => {

      /**
       *
       * @param footprint
       * @returns {Polygon}
       */
      this.getBuildingOffset = (footprint) => {
        return geometryEngine.geodesicBuffer(footprint, 1.0, 'meters');
        //return geometryEngine.offset(footprint, -1.0, 'meters', 'round');
      };

      /**
       *
       * @param {Point} location
       * @returns {boolean}
       */
      this.intersectsNearbyBuilding = (location) => {
        const sightline = this.createSightLine(location);
        return this.nearbyBuildings.some(nearestBuilding => {
          return geometryEngine.intersects(sightline, nearestBuilding);
        });
      };

      /**
       *
       * @param {Point} location
       * @returns {boolean}
       */
      this.withinNearbyBuildings = (location) => {
        return this.nearbyBuildings.some(nearestBuilding => {
          return nearestBuilding.contains(location);
        });
      };

    });
  }

}

export default BuildingIntersections;
