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

import AppBase from "./support/AppBase.js";
import AppLoader from "./loaders/AppLoader.js";
import SignIn from './apl/SignIn.js';
import ReachStatistics from './ReachAnalysis/ReachStatistics.js';

class Application extends AppBase {

  // PORTAL //
  portal;

  constructor() {
    super();

    // LOAD APPLICATION BASE //
    super.load().then(() => {

      // APPLICATION LOADER //
      const applicationLoader = new AppLoader({app: this});
      applicationLoader.load().then(({portal, group, map, view}) => {
        //console.info(portal, group, map, view);

        // PORTAL //
        this.portal = portal;

        // USER SIGN-IN //
        this.configUserSignIn();

        // SET APPLICATION DETAILS //
        this.setApplicationDetails({map, group});

        // APPLICATION //
        this.applicationReady({portal, group, map, view}).catch(this.displayError).then(() => {
          // HIDE APP LOADER //
          document.getElementById('app-loader').removeAttribute('active');
        });

      }).catch(this.displayError);
    }).catch(this.displayError);

  }

  /**
   *
   */
  configUserSignIn() {

    const signInContainer = document.getElementById('sign-in-container');
    if (signInContainer) {
      const signIn = new SignIn({container: signInContainer, portal: this.portal});
    }

  }

  /**
   *
   * @param view
   */
  configView(view) {
    return new Promise((resolve, reject) => {
      if (view) {
        require([
          'esri/core/reactiveUtils',
          'esri/widgets/Home',
          'esri/widgets/Search',
          'esri/widgets/LayerList',
          'esri/widgets/Legend'
        ], (reactiveUtils, Home, Search, LayerList, Legend) => {

          //
          // CONFIGURE VIEW SPECIFIC STUFF HERE //
          //
          view.set({
            constraints: {snapToZoom: false},
            popup: {
              dockEnabled: true,
              dockOptions: {
                buttonEnabled: false,
                breakpoint: false,
                position: "top-right"
              }
            }
          });

          // HOME //
          const home = new Home({view});
          view.ui.add(home, {position: 'top-left', index: 0});

          // LEGEND //
          /*
           const legend = new Legend({ view: view });
           view.ui.add(legend, {position: 'bottom-left', index: 0});
           */

          // SEARCH //
          const search = new Search({view: view});
          view.ui.add(search, {position: 'top-right', index: 0});

          // LAYER LIST //
          const layerList = new LayerList({
            container: 'layer-list-container',
            view: view,
            listItemCreatedFunction: (event) => {
              event.item.open = (event.item.layer.type === 'group');
            },
            visibleElements: {statusIndicators: true}
          });

          // VIEW UPDATING //
          this.disableViewUpdating = false;
          const viewUpdating = document.getElementById('view-updating');
          view.ui.add(viewUpdating, 'bottom-right');
          reactiveUtils.watch(() => view.updating, (updating) => {
            (!this.disableViewUpdating) && viewUpdating.toggleAttribute('active', updating);
          });

          resolve();
        });
      } else { resolve(); }
    });
  }

  /**
   *
   * @param portal
   * @param group
   * @param map
   * @param view
   * @returns {Promise}
   */
  applicationReady({portal, group, map, view}) {
    return new Promise(async (resolve, reject) => {
      // VIEW READY //
      this.configView(view).then(() => {

        //this.initializeSlides({view});

        this.initializeLadderReachAnalysis({view});

        this.initializeStatsView({view});

        resolve();
      }).catch(reject);
    });
  }

  /**
   *
   * @param view
   */
  initializeSlides({view}) {
    require(["esri/widgets/Expand"], (Expand) => {

      const slidesList = new Slides({view: view, displayThumbnails: false});

      const slidesExpand = new Expand({
        view: view,
        content: slidesList,
        expandIconClass: "esri-icon-applications",
        expandTooltip: "Slides"
      });
      view.ui.add(slidesExpand, {position: "top-left", index: 1});

    });
  }

  /**
   *
   *
   * @param view
   */
  initializeLadderReachAnalysis({view}) {

    this.fireTrucksList = document.getElementById('fire-trucks-list');
    this.fireTrucksList.initialize({view, buildingsLayerTitle: this.buildingsLayerTitle});

    let _viewClickHandle;
    const clearClickHandle = () => {
      if (_viewClickHandle) {
        _viewClickHandle.remove();
        _viewClickHandle = null;
      }
    };
    const toggleViewClick = active => {
      clearClickHandle();
      if (active) {
        //clearResults();
        _viewClickHandle = view.on('click', clickEvt => {
          this.fireTrucksList.resetSelectedLocation(clickEvt.mapPoint);
          toggleLocationBtn();
        });
      }
    };

    const toggleLocationBtn = () => {
      const isActive = setFiretruckLocationBtn.toggleAttribute('active');
      setFiretruckLocationBtn.setAttribute('icon-end', isActive ? 'check' : 'blank');
      setFiretruckLocationBtn.setAttribute('appearance', isActive ? 'solid' : 'outline');
      view.container.style.cursor = isActive ? 'crosshair' : 'default';
      toggleViewClick(isActive);
    };

    const setFiretruckLocationBtn = document.getElementById('set-firetruck-location-btn');
    setFiretruckLocationBtn.addEventListener('click', () => {
      toggleLocationBtn();
    });

    const clearFiretruckLocationBtn = document.getElementById('clear-firetruck-location-btn');
    clearFiretruckLocationBtn.addEventListener('click', () => {
      clearResults();
    });

    const clearResults = () => {
      this.fireTrucksList.resetSelectedLocation();
      this.dispatchEvent(new CustomEvent('results-cleared', {detail: {}}));
    };

    const resultsTruckId = document.getElementById('results-truck-id');
    const resultsCandidatesCount = document.getElementById('results-candidates-count');
    const resultsBuildingIntersectionsCount = document.getElementById('results-building-intersections-count');
    const resultsBuildingIntersectionsIndicator = document.getElementById('results-building-intersections-indicator');

    this.fireTrucksList.addEventListener('analysis-results', ({detail: {label, location, validResultsCount, intersectedCount, visibleCount, obstructedCount}}) => {

      const coverage = validResultsCount ? (visibleCount / validResultsCount) : 0;
      resultsBuildingIntersectionsIndicator.setAttribute('value', String(coverage));
      resultsBuildingIntersectionsIndicator.setAttribute('text', `${ Math.round(coverage * 100) }%`);

      resultsTruckId.innerHTML = label;
      resultsCandidatesCount.innerHTML = validResultsCount;
      resultsBuildingIntersectionsCount.innerHTML = `${ visibleCount } of ${ validResultsCount }`;

    });

    /*
     require(["esri/widgets/DirectLineMeasurement3D"], (DirectLineMeasurement3D) => {
     const measurementWidget = new DirectLineMeasurement3D({view: view});
     view.ui.add(measurementWidget, "top-right");
     });
     */

  }

  /**
   *
   * @param view
   */
  initializeStatsView({view}) {
    require([
      "esri/core/reactiveUtils",
      "esri/Map",
      "esri/views/MapView"
    ], (reactiveUtils, EsriMap, MapView) => {

      const statsView = new MapView({
        container: 'stats-view-container',
        constraints: {snapToZoom: false},
        ui: {components: []},
        map: new EsriMap({basemap: "satellite"}),
        viewpoint: view.viewpoint.clone()
      });
      statsView.when(() => {

        reactiveUtils.watch(() => view.viewpoint, (viewpoint) => {
          const mapViewpoint = viewpoint.clone();
          mapViewpoint.scale = 1000;
          statsView.viewpoint = mapViewpoint;
        });

        const reachStats = new ReachStatistics({view: statsView});
        this.fireTrucksList.addEventListener('analysis-results', ({detail: {label, location, validResultsCount, intersectedCount, visibleCount, obstructedCount}}) => {
          reachStats.addLocationStatistic({location, count: visibleCount});
        });

        this.fireTrucksList.addEventListener('truck-type-change', ({detail: {}}) => {
          reachStats.clearLocationStatistics();
        });

        this.addEventListener('results-cleared', () => {
          reachStats.clearLocationStatistics();
        });

      });

    });

  }

}

export default new Application();
