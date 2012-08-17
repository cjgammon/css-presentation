(function() {
	
	function DockView(containerEl) {
		DockView.super.call(this);

		this.containerEl = containerEl;
		this.columns = [];
		this.panelsByName = {};

		this.containerEl.addClass("dock-root");
	}

	Global.Utils.extend(DockView).from(Global.EventDispatcher);
	
	$.extend(DockView.prototype, {
		add: function(panel) {
			this.panelsByName["_" + panel.name] = panel;
			var column = this.addColumn();
			return column.add(panel);
		},

		addColumn: function() {
			if (!this.columns.length)
				this.addSeparator();
			var column = new Global.DockColumn(this, "vertical");
			this.columns.push(column);
			this.containerEl.append(column.el);
			this.addSeparator();
			return column;
		},

		addSeparator: function() {
			var prev, startWidth, startOffset,
				min, max, self = this;
			var separator = $("<div />")
				.addClass("panel-separator")
				.draggable({ 
					axis: "x",
					scroll: false,
					helper: $("<div />"),
					start: function(event, ui) {
						if (separator.next().length == 0)
							return false;
						prev = separator.prev();
						if (prev.length == 0)
							return false;
						startWidth = prev.outerWidth();
						startOffset = ui.helper.offset().left;
						min = 350;
						max = self.containerEl.width() - (self.columns.length - 1) * min;
					},
					drag: function(event, ui) {
						prev.css("-webkit-flex", 1);
						var newDimension = startWidth + (ui.offset.left - startOffset);
						prev.css("width", Math.min(max, Math.max(min, newDimension)));
						$("body").trigger("dockViewResized", ["horizontal"]);
					}
				});
			this.containerEl.append(separator);
		}
	});

	DockView.test = function () {
		var dockView = new Global.DockView($("#dock-view"));
		var panel1 = new Global.DockPanel("panel1");
		dockView.add(panel1);

		var panel1_1 = new Global.DockPanel("panel1-1");
		var panel1_2 = new Global.DockPanel("panel1-2");
		panel1.container.add(panel1_1);
		panel1.container.add(panel1_2);


		var panel2 = new Global.DockPanel("panel1");
		dockView.add(panel2);
		var panel2_1 = new Global.DockPanel("panel2-1");
		var panel2_2 = new Global.DockPanel("panel2-2");
		panel2.container.add(panel2_1);
		panel2.container.add(panel2_2);

		var container2 = panel2.container.column.addContainer();

		var panel3 = new Global.DockPanel("panel1");
		container2.add(panel3);

		var panel4 = new Global.DockPanel("panel4");
		container2.add(panel4);
	}

	Global.DockView = DockView;

})();