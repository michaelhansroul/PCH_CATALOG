define([
	"dojo/Evented",
    "dojo/_base/declare",
	"dojo/on",
	"dojo/_base/lang",
	"dojo/dom-class",
	"./Panel"
], function(
	Evented,
	declare,
	on,
	lang,
	domClass,
	Panel
	)
{
    return declare([Evented], {
		constructor: function(map,config,container,widget){
			this.widget = widget;
			this.map = map;
			this.panels = [];
			this.container = container;
			this.config = config;
			this.label = config.label;
			this.isPanelCreate = false;
		},
		
		addPanels:function()
		{
			if(!this.config.panels) return;

			if(!this.isPanelCreate)
			{
				for(var i=0;i<this.config.panels.length;i++)
				{
					var panel = new Panel(this.map,this.config.panels[i]);
					var p = panel.load();
					p.then(
						lang.hitch(this,function(){}),
						lang.hitch(this,function(error){
							this.widget.error(error);
						})
					);
					/*panel.load().then(
						lang.hitch(this,function(){
							//After load
							
						}),
						lang.hitch(this,function(error){
							this.widget.error(error);
						}),
					);*/

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
		},
		
		removePanels:function(){
			for(var i=0;i<this.panels.length;i++)
			{
				this.container.removeChild(this.panels[i].dom);
			}
		}
    });
});