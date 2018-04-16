define([
	"dojo/Evented",
    "dojo/_base/declare",
	"dojo/on",
	"dojo/_base/lang",
	"dojo/dom-class",
	'../tree_amd',
	'../treeItem',
	"esri/layers/ArcGISDynamicMapServiceLayer",
	'jimu/LayerInfos/LayerInfoFactory',
	'jimu/LayerInfos/LayerInfos',
	'esri/InfoTemplate',
	'esri/request',
	'esri/layers/WMSLayer',
	'esri/layers/ArcGISTiledMapServiceLayer',
	"esri/layers/FeatureLayer",
	'./TocItem',
	'./Promise',
	'dojo/promise/all'
], function(
	Evented,
	declare,
	on,
	lang,
	domClass,
	Tree,
	TreeItem,
	ArcGISDynamicMapServiceLayer,
	LayerInfoFactory,
	LayerInfos,
	InfoTemplate,
	esriRequest,
	WMSLayer, 
	ArcGISTiledMapServiceLayer,
	FeatureLayer,
	TocItem,
	Promise,
	all
	)
{
    return declare([Evented], {
		constructor: function(map,config,container){
			this.map = map;
			this.config = config;
			this.container = container;
			this.items = [];

			this.create();
		},
		
		create:function()
		{
			this.tree = new Tree(this.container);
			for(var i=0;i<this.config.length;i++)
			{
				var tocItem = new TocItem(this.config[i],this.map);
				this.items.push(tocItem);
				this.tree.addChild(tocItem.treeItem);
			}
		},

		load:function()
		{
			if(this.isLoad) return Promise.resolve();
			this.isLoad = true;
			var promises = [];
			for(var i=0;i<this.items.length;i++)
			{
				promises.push(this.items[i].load());
			}

			var self = this;
			return new Promise(function(resolve, reject) {
				all(promises).then(
					function(){self.showVisibleLayers();resolve();},
					function(error){reject(error);}
				);
			});
		},

		showVisibleLayers:function()
		{
			if(!this.isLoad)return;
			for(var t=0;t<this.tree.items().length;t++)
			{
				this.tree.items()[t].data.show();
			}
		}
    });
});