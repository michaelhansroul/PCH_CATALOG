define(
	['dojo/on','./treeItem',"dojo/dom-class"],
	function(on,TreeItem,domClass)
	{
		return function(div, items)
		{
			var self = this;
			this.ROOT = new TreeItem({'data': this, 'openable': true, 'open': true, 'dragable': false});
			
			if( typeof div == 'string' )
				div = document.getElementById(div);
				
			domClass.remove(this.ROOT.dom, 'treeItem');
			div.appendChild(this.ROOT.dom);
			
			if( typeof items != 'undefined' )
				this.ROOT.addChild(items);
			
			this.onDragDrop = function(item, parent){}
			this.onAddChild = function(item){}
			this.onRemoveChild = function(item){}
			this.onClear = function(){}
			this.onMoveChild = function(item){}
			
			this.ROOT.on('onAddChild', function(item) { self.onAddChild(item); });
			this.ROOT.on('onRemoveChild', function(item) { self.onRemoveChild(item); });
			this.ROOT.on('onClear', function(item) { self.onClear(item); });
			this.ROOT.on('onMoveChild', function(item) { self.onMoveChild(item); });
			
			this.addChild = function(child) { this.ROOT.addChild(child); }
			this.removeChild = function(child) { this.ROOT.removeChild(child); }
			this.clear = function() { this.ROOT.clear(); }
			this.items = function() { return this.ROOT.children; }
			
			this.find = function(property, value, parent)
			{
				if( !parent )
					parent = this.ROOT;
				
				if( typeof property == 'string' )
					property = property.split('.');
				
				var data = parent.data;
				for( var p = 0; p < property.length; p++ )
					if(data)
						data = data[property[p]];
				
				if( data == value )
					return parent;

				for( var i = 0; i < parent.children.length; i++ )
				{
					var item = this.find(property, value, parent.children[i]);
					if( item )
						return item;
				}
				
				return null;
			}
			
			// =============================
			// JSON
			// =============================
			this.toJSON = function()
			{
				return this.items();
			}
			
			this.fromJson = function(json)
			{
				this.clear();
				
				for( var i = 0; i < json.length; i++ )
				{
					var item = new TreeItem();
					item.fromJson(json[i]);
					this.addChild(item);
				}
			}
		}
	}
);