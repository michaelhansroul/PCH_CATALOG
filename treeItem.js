define(
	['dojo/on','dojo/Evented','./tree_amd','./treeItem',"dojo/dom-class"],
	function(on,Evented,Tree,TreeItem,domClass)
	{
		return function(properties)
		{
			var self = this;
			this.allowDragAccrossGroup=false;
			this.data = null;
			this.dom = null;
			this.parent = null;
			this.children = [];
			this.evented = new Evented();
			
			this.on = function(eventType, listener)
			{
				this.evented.on(eventType, listener);
			}
			
			this.emi = function(eventType, eventObject)
			{
				this.evented.emit(eventType, eventObject);
			}
			
			this.onAddChild = function(item){self.emi("onAddChild",item);}
			this.onRemoveChild = function(item){self.emi("onRemoveChild",item);}
			this.onClear = function(){self.emi("onClear",null);}
			this.onMoveChild = function(item){self.emi("onMoveChild",item);}
			this.onRemove = function(){self.emi("onRemove",null);}
			
			// =============================
			// INITIALIZE DOM NODE
			// =============================
			
			this.generateUUID = function() { // Public Domain/MIT
				var d = new Date().getTime();
				if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
					d += performance.now(); //use high-precision timer if available
				}
				return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
					var r = (d + Math.random() * 16) % 16 | 0;
					d = Math.floor(d / 16);
					return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
				});
			}
			
			this.initialize = function()
			{
				this.dom = document.createElement('DIV');
				this.dom.className = "treeItem level_" + this.getLevel();
				this.dom.id = '__ti_' + this.generateUUID();
				this.dom.getItem = function() { return self; }
				on(this.dom, 'click', function(e)
				{
					e = e || window.event;
					var t = e.target || e.srcElement;
					if( t === self.dom )
						self.toggle();
				});
				
				// content node
				var content = document.createElement('DIV');
				content.className = "treeItemLabel";
				on(content, 'mousedown', function(e){ self.startDrag(e); });
				content.canDrop = function(item, before) { return self.canDrop(item, before); }
				content.drop = function(item, before) { return self.drop(item, before); }
				this.dom.appendChild(content);
				
				// children node
				var children = document.createElement('DIV');
				children.className = "treeItemChildrenContainer";
				this.dom.appendChild(children);
				
				// open by default
				this.open();
			}
			
			this.setContent = function(content)
			{
				if( typeof content == 'string' )
					this.dom.childNodes[0].innerHTML = content;
				else
					this.dom.childNodes[0].appendChild(content);
			}
			
			// =============================
			// OPEN/CLOSE
			// =============================
			this.setOpenable = function(value)
			{
				if( value )
					domClass.add(this.dom, 'openable');
				else
					domClass.remove(this.dom, 'openable');
			}
			
			this.isOpenable = function() { return domClass.contains(this.dom, 'openable'); }
			this.isOpen = function() { return domClass.contains(this.dom, 'open'); }
			this.isClosed = function() { return !this.isOpen(); }
			
			this.open = function()
			{
				if( !this.isOpenable() )
					return;
				domClass.add(this.dom, 'open');
			}
			
			this.close = function()
			{
				if( !this.isOpenable() )
					return;
				domClass.remove(this.dom, 'open');
			}
			
			this.toggle = function()
			{
				if( this.isOpen() )
					this.close();
				else
					this.open();
			}
			
			// =============================
			// LEVEL
			// =============================
			this.getLevel = function()
			{
				var level = 0;
				var parent = this.parent;
				while( parent != null )
				{
					level++;
					parent = parent.parent;
				}
				
				return level;
			}
			
			// =============================
			// CHILDREN
			// =============================
			this.addChild = function(child)
			{
				if( !Array.isArray(child) )
					child = [child];

				for( var i = 0; i < child.length; i++ )
				{
					//if( !(child[i] instanceof TreeItem) )
					//	continue;

					child[i].parent = this;
					this.dom.childNodes[1].appendChild(child[i].dom);
					this.children.push(child[i]);
					
					this.onAddChild(child[i]);
				}
				
				this.setOpenable( this.isOpenable() || (this.children.length > 0));
			}
				
			this.removeChild = function(child)
			{
				if( child instanceof TreeItem )
				{
					for( var i = 0; i < this.children.length; i++ )
					{
						if( this.children[i] === child )
						{
							child = i;
							break;
						}
					}
				}
				
				if( typeof child != 'number' || child < 0 || child >= this.children.length )
					throw 'Invalid child item';
				
				var original = this.children.splice(child, 1);
				this.dom.childNodes[1].removeChild(this.dom.childNodes[1].childNodes[child]);
				
				original[0].onRemove();
				this.onRemoveChild(original[0]);
			}
			
			this.clear = function()
			{
				for( var i = 0; i < this.children.length; i++ )
				{
					this.children[i].clear();
					this.children[i].onRemove();
				}
				
				this.children = [];
				while( this.dom.childNodes[1].childNodes.length > 0 )
				{
					this.dom.childNodes[1].removeChild(this.dom.childNodes[1].firstChild);
				}
					
				this.onClear();
			}
			
			// =============================
			// INDEX
			// =============================
			this.getIndex = function()
			{
				if( this.parent == null )
					return -1;
				else
				{
					var sibblings = this.parent.children;
					for( var i = 0; i < sibblings.length; i++ )
						if( sibblings[i] === this )
							return i;
					return -1;
				}
			}
			
			this.setIndex = function(index)
			{
				try
				{
					if( this.parent == null )
						throw 'Impossible to set item index because no parent element is defined';
					if( index < 0 )
						throw 'Invalid index';
					
					var current = this.getIndex();
					if( index == current )
						return;

					if( index < current )
					{
						this.parent.children.splice(current, 1);
						this.parent.children.splice(index, 0, this);
						this.parent.dom.childNodes[1].insertBefore(this.parent.dom.childNodes[1].childNodes[current], this.parent.dom.childNodes[1].childNodes[index]);
					}
					else
					{
						this.parent.children.splice(current, 1);
						this.parent.children.splice(index, 0, this);
						this.parent.dom.childNodes[1].insertBefore(this.parent.dom.childNodes[1].childNodes[current], this.parent.dom.childNodes[1].childNodes[index+1]);
					}
					
					this.parent.onMoveChild(this);
				}
				catch(e)
				{
					
				}
			}
			
			// =============================
			// DRAGABLE
			// =============================
			this.dragable = true;
			
			// =============================
			// CONSTRUCTOR
			// =============================
			this.initialize();
			if( typeof properties == 'object' )
			{
				if( properties.hasOwnProperty('data') )
					this.data = properties.data;
				
				if( properties.hasOwnProperty('children') )
					this.addChild(properties.children);

				if( properties.hasOwnProperty('openable') )
					this.setOpenable(properties.openable);
				if( properties.hasOwnProperty('open') )
				{
					if( properties.open )
						this.open();
					else
						this.close();
				}
				if( properties.hasOwnProperty('content') )
					this.setContent(properties.content);
				
				if( properties.hasOwnProperty('dragable') )
					this.dragable = properties.dragable;
			}
			
			// =============================
			// DRAG & DROP
			// =============================
			this.__handlerMove = null;
			this.__handlerUp = null;
			this.__realDrag = false;
			this.__previousAllowed = null;
			this.__dropBefore = false;
			
			this.startDrag = function(event)
			{
				if( !this.dragable )
					return;

				event = event || window.event;
				
				this.__handlerMove = on(document, 'mousemove', document, function(e)
				{
					e = e || window.event;
					
					if( self.__previousAllowed != null )
					{
						removeClassName(self.__previousAllowed.parentNode, 'dragTop');
						removeClassName(self.__previousAllowed.parentNode, 'dragBottom');
						self.__previousAllowed = null;
					}
					
					if( !self.__realDrag )
					{
						if( Math.abs(event.clientX - e.clientX) > 8 || Math.abs(event.clientY - e.clientY) > 8 )
							self.__realDrag = true;
					}
					else
					{
						var t = e.target || e.srcElement;
						if( !t.nodeName || t.nodeName != 'DIV' || !domClass.contains(t, 'treeItemLabel') )
						{
							if( domClass.contains(t, 'treeItem') )
								t = t.firstChild;
							else
							{
								// maybe a descendant of the treeItemLabel ?
								var t = t.parentNode;
								while (t != null)
								{
									if( domClass.contains(t, 'treeItemLabel') )
										break;
									t = t.parentNode;
								}
								
								if( !t )
									return;
							}
						}
						
						while(true)
						{
							self.__dropBefore = (e.clientY < (position(t).top + (t.offsetHeight/2)));
							if( t.canDrop(self, self.__dropBefore) )
							{
								domClass.add(t.parentNode, (self.__dropBefore?'dragTop':'dragBottom'));
								self.__previousAllowed = t;
								break;
							}
							
							var p = t.parentNode.getItem().parent;
							if( !p )
								break;
							t = p.dom.firstChild;
						}
					}
					
					e.stopPropagation();
					e.preventDefault();
				});
				this.__handlerUp = on(document, 'mouseup', document, function(e)
				{
					if( self.__previousAllowed != null )
					{
						self.__previousAllowed.drop(self, self.__dropBefore);
					}
					self.stopDrag(e);
				});
				
				event.stopPropagation();
				event.preventDefault();
			}
			
			this.stopDrag = function(e)
			{
				this.__realDrag = false;
				
				if( this.__handlerMove != null )
				{
					//dojo.disconnect(this.__handlerMove);
					this.__handlerMove.remove();
					this.__handlerMove = null;
				}
				
				if( this.__handlerUp != null )
				{
					//dojo.disconnect(this.__handlerUp);
					this.__handlerUp.remove();
					this.__handlerUp = null;
				}
				
				if( this.__previousAllowed != null )
				{
					removeClassName(this.__previousAllowed.parentNode, 'dragTop');
					removeClassName(this.__previousAllowed.parentNode, 'dragBottom');
					this.__previousAllowed = null;
				}
			}
			
			this.canDrop = function(item, before)
			{
				if( item.parent === this.parent )
					return true;
				else
					return this.allowDragAccrossGroup;
			}
			
			this.drop = function(item, before)
			{
				try
				{
					if( item === this || (item.parent === this.parent && item.getIndex() == (this.getIndex() + (before?-1:1))))
						return;

					item.parent.removeChild(item);
					this.parent.addChild(item);
					item.setIndex(this.getIndex() + (before?0:1));
					
					// launch onDragDrop on the tree
					var i = this;
					while( i.parent != null ) i = i.parent;
					if( i.data instanceof Tree )
						i.data.onDragDrop(item, item.parent);
				}
				catch(e)
				{
					
				}
			}

			// =============================
			// JSON
			// =============================
			this.toJSON = function()
			{
				return {
					'data': this.data,
					'children': this.children,
					'dragable': this.dragable,
					'content': this.dom.childNodes[0].innerHTML
				};
			}
			
			this.fromJson = function(json)
			{
				this.clear();
				this.data = null;
				this.dragable = true;
				
				if( json.hasOwnProperty('data') )
					this.data = json.data;
				if( json.hasOwnProperty('dragable') )
					this.dragable = json.dragable;
				if( json.hasOwnProperty('children') && json.children )
				{
					for( var i = 0; i < json.children.length; i++ )
					{
						var item = new TreeItem();
						item.fromJson(json.children[i]);
						this.addChild(item);
					}
				}
				if( json.hasOwnProperty('content') )
					this.setContent(json.content);
			}
		}
	}
);