define([
	"dojo/Evented",
    "dojo/_base/declare",
	"dojo/on",
	"dojo/_base/lang",
	"dojo/dom-class",
	"./Panel",
	"./MapItemService"
], function(
	Evented,
	declare,
	on,
	lang,
	domClass,
	Panel,
	MapItemService
	)
{
    return declare([Evented], {
		constructor: function(map,config,container,proxy){
			this.proxy = proxy;
			this.map = map;
			this.panels = [];
			this.container = container;
			this.config = config;
			this.label = config.label;
			this.isMapItemsLoad = false;
			this.isPanelCreate = false;
		},

		showVisibleLayer:function()
		{
			for(var p=0;p<this.panels.length;p++)
			{
				this.panels[p].showVisibleLayer();
			}
		},

		hideVisibleLayer:function()
		{
			for(var p=0;p<this.panels.length;p++)
			{
				this.panels[p].hideVisibleLayer();
			}
		},

		loadMapItems:function(){
			
			return new Promise(lang.hitch(this,
			function(resolve, reject) {
				if(this.isMapItemsLoad) {resolve();return;}
				if(!this.config.panels) {resolve();return;}

				///LOAD MAP ITEMS
				var mapItems = [];
				for(var i=0;i<this.config.panels.length;i++)
				{
					var panel = this.config.panels[i];
					var panelMapItems = this.getMapItems(panel.services);
					mapItems = mapItems.concat(panelMapItems);
				}
				
				var promises = [];
				for(var i=0;i<mapItems.length;i++)
				{
					var mapItem = new MapItemService(mapItems[i],this.proxy);
					promises.push(mapItem.load());
				}
				
				Promise.all(promises).then(
					lang.hitch(this,function(results){
						this.isMapItemsLoad = true; 
						resolve();}),
					lang.hitch(this,function(error){reject(error);})
				);
				
				
			}));
		},
		
		getMapItems:function(services)
		{
			if(!services) return [];
			var mapItems = [];
			for(var i=0;i<services.length;i++)
			{
				var service = services[i];
				var isGroupLayer = (service.services && service.services.length>0);
				if(isGroupLayer)
				{
					mapItems = mapItems.concat(this.getMapItems(service.services));
				}
				else if(service.type=="webMap")
				{
					mapItems.push(service);
				}
			}
			return mapItems;
		},
		
		addPanels:function()
		{
			if(!this.config.panels) return;

			if(!this.isPanelCreate)
			{
				for(var i=0;i<this.config.panels.length;i++)
				{
					var panel = new Panel(this.map,this.config.panels[i],this.proxy);
					if(i>0)
						panel.hide();
					this.panels.push(panel);
				}
				this.isPanelCreate = true;
			}
			
			for(var i=0;i<this.panels.length;i++)
			{
				this.container.appendChild(this.panels[i].dom);
			}
			this.showVisibleLayer();
		},
		
		removePanels:function(){
			for(var i=0;i<this.panels.length;i++)
			{
				this.container.removeChild(this.panels[i].dom);
			}
			//this.hideVisibleLayer();
		}
    });
});