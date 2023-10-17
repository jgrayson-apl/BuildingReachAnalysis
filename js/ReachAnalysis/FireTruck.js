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

import BuildingIntersections from './BuildingIntersections.js';

/**
 *
 * FireTruck
 *  - Fire Truck
 *
 * https://developers.arcgis.com/javascript/latest/api-reference/esri-analysis-LineOfSightAnalysis.html
 * https://developers.arcgis.com/javascript/latest/api-reference/esri-views-3d-analysis-LineOfSightAnalysisResult.html
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  6/14/2022 - 0.0.1 -
 * Modified:
 *
 */
class FireTruck extends EventTarget {

  static version = '0.0.1';

  /**
   * @type {reactiveUtils}
   */
  reactiveUtils;

  /**
   * @type {FireTruckInfo}
   */
  fireTruckInfo;

  /**
   * @type {SceneView}
   */
  view;

  /**
   * @type {Graphic}
   */
  fireTruckGraphic;

  /**
   * @type {Graphic}
   */
  jackSpreadGraphic;

  /**
   * @type {GraphicsLayer}
   */
  fireTrucksLayer;

  /**
   * @type {GraphicsLayer}
   */
  jackSpreadsLayer;

  /**
   * @type {Point}
   */
  observer;

  /**
   * @type {Point}
   */
  location;

  /**
   * @type {number}
   * @private
   */
  _heading;
  set heading(value) {
    let heading = (value % 360.0);
    if (heading < 0.0) { heading = 360.0 + heading; }
    this._heading = heading;
    this.updateJackSpread();
  }

  /**
   * @type {BuildingIntersections}
   */
  buildingsIntersections;

  /**
   * @typedef { {results: []} } LineOfSightAnalysisView3D
   */

  /**
   * @type {LineOfSightAnalysisView3D}
   */
  analysisView;

  /**
   * @typedef { "move-start" | "move" | "move-stop"  | "reset" | "complete" } Action
   */

  /**
   * @type {Action}
   * @private
   */
  _action;

  /**
   * @type {LineOfSightAnalysis}
   */
  LOS;

  /**
   *
   * @param {SceneView} view
   * @param {string} buildingsLayerTitle
   */
  constructor({view, buildingsLayerTitle}) {
    super();

    this._heading = 0.0;
    this._action = 'complete';

    // SCENE VIEW //
    this.view = view;

    // BUILDING INTERSECTIONS //
    // 'OSM Footprints'
    this.buildingsIntersections = new BuildingIntersections({view: this.view, buildingsLayerTitle});

  }

  /**
   *
   * @param {FireTruckInfo} fireTruckInfo
   */
  initialize({fireTruckInfo}) {
    require([
      "esri/core/reactiveUtils",
      'esri/layers/GraphicsLayer',
      "esri/Graphic"
    ], (reactiveUtils, GraphicsLayer, Graphic) => {

      this.reactiveUtils = reactiveUtils;

      this.fireTruckInfo = fireTruckInfo;
      this._heading = this.fireTruckInfo.defaultHeading;

      this.initializeGeometryUtils().then(() => {

        //
        // JACK SPREADS LAYER
        //
        this.jackSpreadGraphic = new Graphic({symbol: this.fireTruckInfo.jackSpreadSymbol});
        this.jackSpreadsLayer = new GraphicsLayer({
          title: "Jack Spreads",
          elevationInfo: {mode: "on-the-ground"},
          graphics: [this.jackSpreadGraphic]
        });
        this.view.map.add(this.jackSpreadsLayer);

        //
        // FIRE TRUCKS
        //
        const fireTruckSymbol = this.fireTruckInfo.getFireTruckSymbol({heading: this._heading});
        this.fireTruckGraphic = new Graphic({symbol: fireTruckSymbol});
        this.fireTrucksLayer = new GraphicsLayer({
          title: "Fire Trucks",
          elevationInfo: {mode: "absolute-height"},
          graphics: [this.fireTruckGraphic]
        });
        this.view.map.add(this.fireTrucksLayer);

        // REACH ANALYSIS //
        this.initializeReachAnalysis();

      });
    });

  }

  /**
   *
   * @param {FireTruckInfo} fireTruckInfo
   */
  setTruckInfo({fireTruckInfo}) {

    this.fireTruckInfo = fireTruckInfo;

    const fireTruckSymbol = this.fireTruckInfo.getFireTruckSymbol({heading: this._heading});
    this.fireTruckGraphic.set({symbol: fireTruckSymbol});

    this.jackSpreadGraphic.set({symbol: this.fireTruckInfo.jackSpreadSymbol});

    this.setLocation({location: this.location, action: 'reset'});

  }

  /**
   *
   */
  initializeReachAnalysis() {
    require([
      "esri/core/reactiveUtils",
      "esri/analysis/LineOfSightAnalysis"
    ], (reactiveUtils, LineOfSightAnalysis) => {

      this.LOS = new LineOfSightAnalysis({});
      this.view.analyses.add(this.LOS);

      this.view.whenAnalysisView(this.LOS).then(analysisView => {
        this.analysisView = analysisView;
        this.analysisView.visible = false;

        // ANALYSIS IS FINISHED UPDATING //
        this.reactiveUtils.when(() => !this.analysisView.updating, () => {
          if (this.analysisView.visible) {

            const validResults = this.analysisView.results.filter(result => result != null);
            if (validResults.length) {
              this.updateAnalysisResults({validResults});

              if (['move-stop', 'reset'].includes(this._action)) {
                this._action = 'complete';
                this.analysisView.visible = false;
              }
            }
          }
        }, {initial: true});

      });
    });
  }

  /**
   *
   * @param {[]} validResults
   */
  updateAnalysisResults({validResults}) {

    const intersections = validResults.reduce((list, losResult) => {
      if (losResult.intersectedLocation != null) {
        list.push(losResult.intersectedLocation);
      }
      return list;
    }, []);

    const {visibleCount, obstructedCount} = this.buildingsIntersections.findIntersections({
      intersections,
      action: this._action
    });

    this.dispatchEvent(new CustomEvent('analysis-results', {
      detail: {
        label: this.fireTruckInfo.label,
        location: this.observer.clone(),
        validResultsCount: validResults.length,
        intersectedCount: intersections.length,
        visibleCount, obstructedCount
      }
    }));

  }

  /**
   *
   * @param {Point} location
   * @param {Action} action
   */
  setLocation({location, action}) {

    this.location = location?.clone();
    if (this.location) {

      this.observer = this.location.clone();
      this.observer.z += this.fireTruckInfo.height;
      this.fireTruckGraphic.geometry = this.observer;
      this.updateJackSpread();

    } else {

      this.observer = null;
      this.fireTruckGraphic.geometry = null;
      this.updateJackSpread();
    }

    this.updateReachAnalysis({action});

  }

  /**
   *
   */
  updateJackSpread() {
    this.jackSpreadGraphic.geometry = this._createJackSpreadPerimeter();
  }

  /**
   *
   * @param {Number} elevation
   * @returns {number}
   * @private
   */
  _getInclinationAtElevation(elevation) {
    let slope = ((this.observer.z - elevation) / this.fireTruckInfo.ladderReach);
    slope = Math.max(-1, Math.min(slope, 1));
    return (Math.acos(slope) * (180 / Math.PI)) - 90.0;
  }

  /**
   *
   * @param {number[]} coords
   * @returns {boolean}
   * @private
   */
  _isWithinRange(coords) {
    const inclination = this._getInclinationAtElevation(coords[2]);
    return !Number.isNaN(inclination) && (inclination > this.fireTruckInfo.range[0]) && (inclination < this.fireTruckInfo.range[1]);
  }

  /**
   *
   */
  initializeGeometryUtils() {
    return new Promise((resolve, reject) => {
      require([
        "esri/geometry/Point",
        "esri/geometry/Polyline",
        "esri/geometry/Polygon",
        "esri/geometry/Circle",
        "esri/geometry/Mesh",
        "esri/geometry/geometryEngine"
      ], (Point, Polyline, Polygon, Circle, Mesh, geometryEngine) => {

        /**
         *
         * @param {number} planarDistanceMeters
         * @param {number} azimuth
         * @returns {Point}
         * @private
         */
        const _pointFromDistance = (planarDistanceMeters, azimuth) => {
          const planarBuffer = new Circle({
            center: this.observer,
            geodesic: true,
            radius: planarDistanceMeters,
            radiusUnit: 'meters',
            numberOfPoints: 360
          });
          let pointIndex = Math.floor(azimuth); // - 90;  // no adjustment when geodesic=true //
          if (pointIndex < 0) {pointIndex += 360; }
          return planarBuffer.getPoint(0, pointIndex);
        };

        /**
         *
         * @returns {Polygon}
         * @private
         */
        this._createJackSpreadPerimeter = () => {
          if (this.fireTruckGraphic.geometry) {
            let truckBack = _pointFromDistance(this.fireTruckInfo.ladderOffset, this._heading - 180);
            let truckFront = _pointFromDistance(this.fireTruckInfo.depth - this.fireTruckInfo.ladderOffset, this._heading);
            const truckCenterline = new Polyline({spatialReference: this.observer.spatialReference});
            truckCenterline.addPath([truckBack, truckFront]);

            const spreadDistance = (this.fireTruckInfo.jackSpread * 0.5);
            let jackSpreadArea = geometryEngine.geodesicBuffer(truckCenterline, spreadDistance, 'meters');
            let jackSpreadPerimeter = new Polyline({spatialReference: this.observer.spatialReference, paths: jackSpreadArea.rings});
            jackSpreadPerimeter = this.view.groundView.elevationSampler.queryElevation(jackSpreadPerimeter);
            return new Polygon({spatialReference: this.observer.spatialReference, rings: jackSpreadPerimeter.paths});
          } else {
            return null;
          }
        };

        /**
         *
         * @param {number[]} coords
         * @returns {Point}
         * @private
         */
        this._coordsToPoint = (coords) => {
          return new Point({
            spatialReference: this.observer.spatialReference,
            x: coords[0], y: coords[1], z: coords[2]
          });
        };

        /**
         *
         * @returns {number[]}
         * @private
         */
        this._getSphereVertices = () => {
          if (this.observer) {

            const targetSphere = Mesh.createSphere(this.observer, {
              //densificationFactor: (this._action === 'move') ? 0 : 1,
              densificationFactor: 1,
              size: (this.fireTruckInfo.ladderReach * 2.0),
              unit: 'meters'
            }).centerAt(this.observer);

            return Array.from(targetSphere.vertexAttributes.position);

          } else { return []; }
        };

        /**
         *
         * @param {Point[]} targets
         * @returns {Polyline[]}
         * @private
         */
        /*this._getSightLines = ({targets}) => {
         if (this.observer) {

         const observerSR = this.observer.spatialReference;
         const observerCoords = [this.observer.x, this.observer.y, this.observer.z];

         // RETURN SIGHTLINES //
         return targets.map(target => {
         // SIGHTLINE //
         return new Polyline({
         spatialReference: observerSR, hasZ: true,
         paths: [[observerCoords, [target.x, target.y, target.z]]]
         });
         });

         } else { return []; }
         };*/

        // GEOMETRY UTILITIES READY //
        resolve();
      });
    });
  }

  /**
   *
   * @param {Action} action
   */
  updateReachAnalysis({action = 'reset'}) {

    // ACTION //
    this._action = action;

    if (['move-start', 'reset'].includes(this._action)) {
      this.buildingsIntersections.clearIntersections();
      this.analysisView.visible = true;
    }

    if (this.observer) {

      // NEARBY BUILDINGS //
      this.buildingsIntersections.findNearbyBuildings({
        observer: this.observer,
        distance: this.fireTruckInfo.ladderReach
      }).then(({hasNearbyBuildings}) => {

        // TARGETS //
        const targets = [];

        // ARE THERE ANY NEARBY BUILDINGS? //
        if (hasNearbyBuildings) {

          // SPHERE POSITIONS //
          const positions = this._getSphereVertices();

          // COORDS //
          let coords = [];
          while (positions.length) {
            coords = positions.splice(0, 3);

            if (this._isWithinRange(coords)) {
              const position = this._coordsToPoint(coords);

              if (this.buildingsIntersections.intersectsNearbyBuilding(position)) {
                targets.push({position});
              }
            }
          }
        }
        this.LOS.set({observer: {position: this.observer}, targets});
      });
    } else {
      this.analysisView.visible = false;
      this.LOS.set({observer: null, targets: null});
    }

  }
}

export default FireTruck;
