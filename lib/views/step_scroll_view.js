/*
 * Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function() {

    function dist(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    }

    function StepScrollView(type, canZoom) {
        StepScrollView.$super.call(this, type, canZoom);
        this.stepPoints = null;
        this.selectedIndex = 0;
        this.selectedView = null;
        this.maxScrollCount = null;
        this.afterSelectionEndTimer = null;
        this.afterSelectionEndData = null;
        this.onAfterSelectionEndCallback = this.onAfterSelectionEnd.bind(this);
    }
    Global.Utils.extend(StepScrollView).from(Global.ScrollView);

    StepScrollView.nullPoint = {
        x: 0,
        y: 0
    };

    $.extend(StepScrollView.prototype, {
        internalRelayout: function() {
            this.stepPoints = null;
            StepScrollView.prototype.$super.internalRelayout.call(this);
        },

        updateStepPoints: function() {
            if (this.stepPoints)
                return;
            var stepPoints = this.stepPoints = [];
            var collectX = this.type != Global.ScrollView.VERTICAL;
            var collectY = this.type != Global.ScrollView.HORIZONTAL;
            var hasValidStepPoints = false;
            this.contentView.forEachChild(function(view) {
                if (!view.stepPointIgnore)
                    hasValidStepPoints = true;
                // Collect all the mid points.
                var rect = view.getBoundingRect();
                stepPoints.push({
                    view: view,
                    x: collectX ? (rect.left + rect.width / 2) : 0,
                    y: collectY ? (rect.top + rect.height / 2) : 0
                });
            });
            this.hasValidStepPoints = hasValidStepPoints;
        },

        count: function() {
            this.updateStepPoints();
            return this.stepPoints.length;
        },

        updateSelectedView: function() {
            this.updateStepPoints();
            var newItem = this.stepPoints.length ? this.stepPoints[this.selectedIndex].view : null;
            if (newItem === this.selectedView)
                return;
            this.clearAfterSelectionEndTimer();
            var oldView = this.selectedView;
            this.selectedView = newItem;
            this.afterSelectionEndData = [newItem, oldView];
            this.fire("viewselected", this.afterSelectionEndData);
            this.afterSelectionEndTimer = setTimeout(this.onAfterSelectionEndCallback, this.time);
        },

        clearAfterSelectionEndTimer: function() {
            if (!this.afterSelectionEndTimer)
                return;
            clearTimeout(this.afterSelectionEndTimer);
            this.afterSelectionEndTimer = null;
            if (this.afterSelectionEndData) {
                var data = this.afterSelectionEndData;
                this.afterSelectionEndData = null;
                this.fire("afterviewselected", data);
            }
        },

        onAfterSelectionEnd: function() {
            this.clearAfterSelectionEndTimer();
        },

        prev: function() {
            this.setSelectedIndex(this.selectedIndex - 1);
        },

        next: function() {
            this.setSelectedIndex(this.selectedIndex + 1);
        },

        setSelectedItem: function(item, useAnimation) {
            this.updateStepPoints();
            var stepPoints = this.stepPoints;
            for (var i = 0; i < stepPoints.length; ++i) {
                if (stepPoints[i].view === item) {
                    this.setSelectedIndex(i);
                    return;
                }
            }
        },

        setSelectedIndex: function(index, useAnimation) {
            if (useAnimation === undefined)
                useAnimation = true;
            this.updateStepPoints();
            var stepPoints = this.stepPoints;
            var stepPoint;
            if (!stepPoints.length) {
                // Just recenter.
                stepPoint = StepScrollView.nullPoint;
            } else {
                if (index < 0 || index >= stepPoints.length)
                    return;
                stepPoint = stepPoints[index];
            }
            var delta = this.createDeltaValue();
            var transformDrag = delta.transformDrag;
            if (this.type != Global.ScrollView.VERTICAL)
                delta.x = (this._scrollWidth / 2 - stepPoint.x) - transformDrag.x;
            if (this.type != Global.ScrollView.HORIZONTAL)
                delta.y = (this._scrollHeight / 2 - stepPoint.y) - transformDrag.y;
            this.fitDeltaInViewport(delta);
            this.contentEl.css(Global.Utils.prefix({
                "transition": useAnimation ? Global.Utils.prefixValue("transform ") + (this.time / 1000) + "s ease-out" : "none"
            }));
            this.updateTransform(delta);
            this.selectedIndex = index;
            this.updateSelectedView(useAnimation);
            this.fire("scrollend", [delta, useAnimation]);
        },

        deltaToIndex: function(delta) {
            var transformDrag = delta.transformDrag,
                middPointX = this._scrollWidth / 2 - (transformDrag.x + delta.x),
                middPointY = this._scrollHeight / 2 - (transformDrag.y + delta.y);
            return this.lookupNearest({ x: middPointX, y: middPointY });
        },

        deltaToFloatIndex: function(delta) {
            var index = this.deltaToIndex(delta);
            if (index == -1)
                return -1;

            var collectX = this.type != Global.ScrollView.VERTICAL;
            var collectY = this.type != Global.ScrollView.HORIZONTAL;

            var transformDrag = delta.transformDrag,
                middPointX = collectX ? (this._scrollWidth / 2 - (transformDrag.x + delta.x)) : 0,
                middPointY = collectY ? (this._scrollHeight / 2 - (transformDrag.y + delta.y)) : 0;

            var stepPointBefore = index > 0 ? this.stepPoints[index - 1] : null,
                stepPoint = this.stepPoints[index],
                stepPointAfter = (index + 1 <= this.stepPoints.length - 1) ? this.stepPoints[index + 1] : null;

            var nextPoint = null,
                nextPointDistance = 0,
                nextPointDirection = 0;

            if (stepPointBefore) {
                nextPointDistance = dist(middPointX, middPointY, stepPointBefore.x, stepPointBefore.y);
                nextPointDirection = -1;
            } else if ((collectX && stepPoint.x > middPointX) ||
                    (collectY && stepPoint.y > middPointY)) {
                // Special case when scrolling towards -1.
                return index;
            }
            if (stepPointAfter) {
                var distance = dist(middPointX, middPointY, stepPointAfter.x, stepPointAfter.y);
                if (!stepPointBefore || distance < nextPointDistance) {
                    nextPointDistance = distance;
                    nextPointDirection = 1;
                }
            } else if ((collectX && stepPoint.x < middPointX) || 
                    (collectY && stepPoint.y < middPointY)) {
                // Special case when scrolling past the last slide.
                return index;
            }

            var stepPointDistance = dist(middPointX, middPointY, stepPoint.x, stepPoint.y);
            var totalDistance = nextPointDistance + stepPointDistance;

            return index + (totalDistance ? (stepPointDistance / totalDistance) * nextPointDirection : 0);
        },

        updateScrollDrag: function(delta) {
            var transformDrag = delta.transformDrag,
                middPointX = this._scrollWidth / 2 - (transformDrag.x + delta.x),
                middPointY = this._scrollHeight / 2 - (transformDrag.y + delta.y);
            var index = this.lookupNearest({ x: middPointX, y: middPointY });
            var stepPoint;
            if (index == -1) {
                // No step point. Just center the thing, by reverting any change.
                stepPoint = StepScrollView.nullPoint;
            } else {
                if (this.maxScrollCount !== null) {
                    var maxScrollCount = Math.ceil(this.maxScrollCount / this.zoomFactor);
                    index = Math.max(this.selectedIndex - maxScrollCount, Math.min(this.selectedIndex + maxScrollCount, index));
                }
                this.selectedIndex = index;
                stepPoint = this.stepPoints[index];
            }
            this.updateSelectedView(true);
            return {
                x: stepPoint.x - middPointX,
                y: stepPoint.y - middPointY
            };
        },

        lookupNearest: function(point) {
            this.updateStepPoints();
            var stepPoints = this.stepPoints;
            var minDistance = Number.MAX_VALUE, minDistancePoint = -1;
            for (var i = 0; i < stepPoints.length; ++i) {
                var stepPoint = stepPoints[i];
                if (this.hasValidStepPoints && stepPoint.view.stepPointIgnore)
                    continue;
                var distance = dist(point.x, point.y, stepPoint.x, stepPoint.y);
                if (minDistance > distance) {
                    minDistance = distance;
                    minDistancePoint = i;
                }
            }
            return minDistancePoint;
        },

        onScrollViewLayoutDone: function() {
            this.setSelectedIndex(this.selectedIndex, false);
        },

        relayoutParent: function() {
            this.stepPoints = null;
            this.relayout();
        }
    });

    Global.StepScrollView = StepScrollView;

})();
