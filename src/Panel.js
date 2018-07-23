define([
	"dojo/Evented",
    "dojo/_base/declare",
	"dojo/on",
	"dojo/_base/lang",
	"dojo/dom-class",
	"./Toc"
], function(
	Evented,
	declare,
	on,
	lang,
	domClass,
	Toc
	)
{
    return declare([Evented], {
		constructor: function(map,config){
			this.map = map;
			this.config = config;
			this.label = config.label;
			this.dom = this.create();
			if(config.services)
				this.toc = new Toc(this.map,config.services,this.content);
		},
		
		load:function()
		{
			if(!this.toc)return new Promise.resolve();
			return this.toc.load();
		},

		create:function(){
			var panel = document.createElement("div");
			panel.className = "panel lighter darkest";
			var header = document.createElement("div");
			header.className = "header darker lightest darkestBorderBottom";
			panel.appendChild(header);
			
			var headerTitle = document.createElement("div");
			headerTitle.className = "left";
			headerTitle.innerHTML = this.label;
			this.headerButton = document.createElement("div");
			this.headerButton.className = "panelButton icon down";
			var headerClear = document.createElement("div");
			headerClear.className = "clear";
			
			header.appendChild(headerTitle);
			header.appendChild(this.headerButton);
			header.appendChild(headerClear);
			
			this.content = document.createElement("div");
			this.content.className = "content";
			
			on(header,"click",lang.hitch(this,function(){
				this.toggle();
			}));
			
			panel.appendChild(header);
			panel.appendChild(this.content);
			
			this.show();
			
			return panel;
		},
		
		toggle: function(){
			if(domClass.contains(this.content,'hide'))
				this.show();
			else
				this.hide();
		},
		
		show:function(){
			domClass.remove(this.content,'hide');
			this.headerButton.className = "panelButton icon up";
		},
		
		hide:function(){
			domClass.add(this.content,'hide');
			this.headerButton.className = "panelButton icon down";
		},

		showVisibleLayer:function()
		{
			if(this.toc)
				this.toc.showVisibleLayer();
		},

		hideVisibleLayer:function()
		{
			if(this.toc)
				this.toc.hideVisibleLayer();
		},

		search:function(value){
			if(this.toc){
				var result = this.toc.search(value);
				if(result.containsService)
					this.dom.style.display = 'block';
				else
					this.dom.style.display = 'none';
			}
		}
		
    });
});