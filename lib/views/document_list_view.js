/*
 * Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.
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

    function DocumentListView(mainView, presetStore) {
        DocumentListView.$super.call(this, Global.ScrollView.HORIZONTAL);
        this.mainView = mainView;
        this.presetStore = presetStore;
        this.contentView.setLayout(new Global.HorizontalLayout());
        this.needsToFitInViewport = false;
        this.el.addClass("document-list-view");
        this.contentView.el.addClass("document-list-content-view");
        this.fillParent();
        this.presetStore.on("presetAdded", this.onPresetAdded.bind(this));
        this.presetStore.on("presetRemoved", this.onPresetRemoved.bind(this));
        this.presetStore.on("activePresetChanged", this.onActivePresetChanged.bind(this));

        this.presetsByName = {};
        this.visible = true;

        this.logoEl = $("<div class='document-list-logo' />").appendTo(this.contentView.el);
        this.logoPointerEl = $("<div class='document-list-logo-pointer' />").appendTo(this.contentView.el);
        this.logoReleaseEl = $("<div class='document-list-logo-release-info' />").text("Release to check for updates").appendTo(this.contentView.el);

        this.addPresetButtonView = new Global.HighlightTouchView();
        this.addPresetButtonView.fillHeight = 1;
        this.addPresetButtonView.stepPointIgnore = true;
        this.addPresetButtonView.el.addClass("add-preset-button");
        var self = this;
        this.addPresetButtonView.on("tap", function() {
            self.presetStore.savePresetAs();
        });
        this.contentView.append(this.addPresetButtonView);

        this.on("scroll", this.onScroll.bind(this));
        this.on("scrollend", this.onScrollEnd.bind(this));
        this.on("viewselected", this.onViewSelected.bind(this));

        this.documentZoomRatio = 0.6;
        this.lastLogoPointerRotation = 0;
    }
    Global.Utils.extend(DocumentListView).from(Global.StepScrollView);

    $.extend(DocumentListView.prototype, {
        show: function() {
            if (this.visible)
                return;
            this.el.css(Global.Utils.prefix({
                "visibility": "visible",
                "opacity": 1
            }));
            this.visible = true;
            this.relayout();
            this.setSelectedItem(this.selectedView);
        },
        hide: function() {
            if (!this.visible)
                return;
            this.el.css(Global.Utils.prefix({
                "visibility": "hidden",
                "opacity": 0
            }));
            this.visible = false;
            this.restoreDocumentTransform();
        },

        loadPreset: function(documentView) {
            if (this.selectedView === documentView) {
                var self = this;
                this.presetStore.loadPreset(documentView.preset, function() {
                    self.mainView.documentView.restoreView();
                    documentView.el.css(Global.Utils.prefix({
                        "opacity": 0
                    }));
                });
            } else
                this.setSelectedItem(documentView);
        },

        createDocumentView: function(preset) {
            var documentView = new Global.ImageView();
            documentView.preset = preset;
            documentView.el.addClass("document-list-item-view");
            var tapView = new Global.HighlightTouchView();
            documentView.tapView = tapView;
            documentView.append(tapView);

            var labelView = new Global.View();
            labelView.el.addClass("document-list-item-view-label").text(preset);
            tapView.prepend(labelView);

            var contentView = new Global.ContentView();
            if (this.presetStore.currentPreset == preset) {
                contentView.setImage(this.presetStore.animation.imageUrl);
                contentView.sourceEl.css(Global.Utils.prefixOne("filter"), this.presetStore.animation.getCSSFilters());
            } else {
                this.presetStore.loadPresetPreview(preset, function(animation) {
                    if (!animation)
                        return;
                    contentView.setImage(animation.imageUrl);
                    contentView.sourceEl.css(Global.Utils.prefixOne("filter"), animation.getCSSFilters());
                });
            }
            tapView.prepend(contentView);
            documentView.contentView = contentView;

            var self = this;
            documentView.on("transformend", function(transform) {
                if (transform && transform.scale > 1.1) {
                    self.loadPreset(documentView);
                    return false;
                }
            });
            tapView.on("tap", function() {
                self.loadPreset(documentView);
            });

            tapView.on("longtaptimer", function() {
                if (self.selectedView !== documentView)
                    return;
                var message = "Are you sure you want to delete the '"+ preset +"' preset?";
                if(window.confirm(message)) {
                    self.presetStore.deletePreset(preset);
                    self.updateCurrentFilterPreset();
                }
            });

            return documentView;
        },

        updateCurrentFilterPreset: function() {
            var documentView = this.presetsByName["_" + this.presetStore.currentPreset];
            if (!documentView)
                return;
            documentView.contentView.setImage(this.presetStore.animation.imageUrl);
            Global.Utils.applyFilterWithDropShadowWorkaround(documentView.contentView.sourceEl, this.presetStore.animation.getCSSFilters());
        },

        onPresetAdded: function(preset) {
            var key = "_" + preset;
            if (this.presetsByName.hasOwnProperty(key))
                return;
            var presetEl = this.createDocumentView(preset);
            this.presetsByName[key] = presetEl;
            this.contentView.before(presetEl, this.addPresetButtonView);
            return presetEl;
        },

        onPresetRemoved: function(preset) {
            var key = "_" + preset,
                presetEl = this.presetsByName[key];
            if (!presetEl)
                return;
            delete this.presetsByName[key];
            var index = this.selectedIndex;
            if (this.selectedView === presetEl) {
                index = Math.max(0, index - 1);
                this.selectedView = null;
            }
            presetEl.el.remove();
            this.relayout();
            this.setSelectedIndex(index);
        },

        onActivePresetChanged: function(newPreset, oldPreset) {
            var oldEl = this.presetsByName["_" + oldPreset],
                newEl = this.presetsByName["_" + newPreset];
            if (!newEl) {
                newEl = this.onPresetAdded(newPreset);
                this.relayout();
            }
            this.setSelectedItem(newEl);
        },

        computeDocumentTransform: function(view) {
            var selectedView = this.selectedView;
            if (!selectedView || !selectedView.contentView)
                return "none";
            var docWidth = this.mainView.width() * this.documentZoomRatio;
            var docHeight = this.mainView.height() * this.documentZoomRatio;
            var docLeft = (this.mainView.width() - docWidth) / 2;
            var docTop = (this.mainView.height() - docHeight) / 2;
            var scaleX = docWidth / view.width();
            var scaleY = docHeight / view.height();
            var transform = selectedView.el.css(Global.Utils.prefixOne("transform"));
            if (transform == "none")
                transform = "";
            return "translate(" + docLeft + "px, " + docTop + "px) " + transform + " scale(" + scaleX + ", " + scaleY + ")";
        },

        hideActiveDocumentWhileZoomingOut: function() {
            var selectedView = this.selectedView;
            if (!selectedView)
                return;
            selectedView.el.css(Global.Utils.prefix({
                "opacity": 0
            }));
        },

        showActiveDocumentAfterZoomingOut: function() {
            var selectedView = this.selectedView;
            if (!selectedView)
                return;
            selectedView.el.css(Global.Utils.prefix({
                "opacity": 1
            }));
        },

        restoreDocumentTransform: function() {
            var selectedView = this.selectedView;
            if (!selectedView)
                return;
            selectedView.el.css(Global.Utils.prefix({
                "transition": "none",
                "opacity": 1,
                "transform": "translateZ(0px)"
            }));
        },

        internalRelayout: function() {
            var width = this.mainView.width() * this.documentZoomRatio;
            var height = this.mainView.height() * this.documentZoomRatio;
            var top = (this.mainView.height() - height) / 2;
            this.contentView.forEachChild(function(childView) {
                if (childView.contentView) {
                    childView.css("margin-top", top)
                             .css("width", width)
                             .css("height", height + 40);
                    childView.tapView.css("width", width).css("height", height + 40);
                    childView.contentView.css("width", width).css("height", height);
                }
            });
            this.updateLogoPosition();
            DocumentListView.prototype.$super.internalRelayout.call(this);
        },

        updateLogoPosition: function() {
            var width = this.mainView.width() * this.documentZoomRatio;
            this.logoEl.css(Global.Utils.prefix({
                "left":  - (this.mainView.width() - width) / 2 - this.logoEl.width()
            }));
        },

        restoreTransformWithLogoAnimation: function() {
            var delta = this.createDeltaValue();
            this.injectAnimationDelta(delta);
            this.fixDeltaValue(delta);
            this.contentEl.css(Global.Utils.prefix({
                "transition": Global.Utils.prefixValue("transform 1s ease-in-out"),
                "transform": "translate3d(" + delta.x + "px, " + delta.y + "px, 0px) " + delta.oldTransform
            }));
            var self = this;
            setTimeout(function() {
                self.updateLogoPosition();
            }, 1000);
        },

        showLogoWithTransition: function() {
            this.contentEl.css(Global.Utils.prefixOne("transform"), "translate3d(" + (this.mainView.width()) + "px, 0px, 0px)");
            this.logoEl.css(Global.Utils.prefix({
                "left": - (this.mainView.width() + this.logoEl.width()) / 2
            }));
            var self = this;
            setTimeout(function() {
                self.restoreTransformWithLogoAnimation();
            }, 0);
        },

        onScrollEnd: function() {
            if (this.lastLogoPointerRotation >= 180) {
                // FIXME: Show the info dialog instead of checking for updates directly.
                this.mainView.app.checkForUpdates();
                this.logoReleaseEl.removeClass("visible");
            }
            this.logoPointerEl.removeClass("visible");
            this.logoPointerEl.css(Global.Utils.prefix({
                "transition": Global.Utils.prefixValue("transform 0.3s linear, opacity 0.3s linear"),
                "transform": "translate3d(0px, -50%, 0px) rotate(0deg)"
            }));
        },

        onScroll: function(delta) {
            var newDragX = delta.transformDrag.x + delta.x;

            var width = this.mainView.width() * this.documentZoomRatio;
            var logoRightPoint = - (this.mainView.width() - width) / 2 + newDragX;
            var maxDrag = this.mainView.width() * 0.6;

            if (logoRightPoint >= 0) {
                var rotation = Math.max(0, Math.min(maxDrag, logoRightPoint)) / maxDrag * 180;
                this.lastLogoPointerRotation = rotation;
                this.logoPointerEl.css(Global.Utils.prefix({
                    "transition": "opacity 0.3s linear",
                    "transform": "translate3d(0px, -50%, 0px) rotate(" + rotation + "deg)"
                }));
                if (rotation >= 180) {
                    this.logoReleaseEl.addClass("visible");
                    this.logoPointerEl.removeClass("visible");
                } else {
                    this.logoReleaseEl.removeClass("visible");
                    this.logoPointerEl.addClass("visible");
                }
            }
        },

        onViewSelected: function(newView, oldView) {
            if (oldView) {
                oldView.el.removeClass("selected");
                oldView.disabled = true;
            }
            if (newView) {
                newView.el.addClass("selected");
                newView.disabled = false;
            }
        }
    });

    Global.DocumentListView = DocumentListView;

})();