const c2k = (string) => 
  string.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

const applyStyles = (el, css) => {
  for (const [prop, value] of Object.entries(css)) {
    el.style[c2k(prop)] = value;
  }
  return el;
}

const _v = (target, chain) => {
  if (!chain) return target;
  try {
    const chainArr = chain.split('.').filter(x => !!x).reverse();
    return _v(target[chainArr.pop()], chainArr.join('.'));
  } catch (e) {
    return target;
  }
};

class Autocomplete extends HTMLElement {
  constructor() {
    super();
    
    this.items = [];
    this.filteredItems = [];
    this.renderQueue = [];
    this.query = '';
    
    this.params = {
      itemTitle: null,
      itemId: null,
      filterStart: 3,
      placeholder: '',
      oneLine: false,
      elementsWhenFirstRender: 50,
      elementsToAddAfter: 25
    };
    
    this.refs = {
      input: null,
      dropdown: null,
      container: null,
      style: null
    };
    
    this.value = null;
  }
  
  _clearChosen() {
    const found = document.querySelectorAll('.dropdown > .list-item.chosen');
    Array.from(found).forEach(x => x.classList.remove('chosen'));
  }
  
  clear() {
    this.value = null;
    this._updateQuery('');
    this._clearChosen();
  }
  
  setValue(newValue) {
    const found = this.items.find(x => _v(x, this.params.itemId) === newValue);
    if (found) {
      this.value = newValue;
      this._updateQuery(this._getItemTitle(found));
    } else {
      console.warn('Item not found in presented items array');
    }
  }
  
  _shiftRenderQueue() {
    return this.renderQueue.splice(0, this.params.elementsToAddAfter);
  }
  
  setItems(items, clear = false) {
    if (!Array.isArray(items)) {
      console.warn('Presented items array is not Array');
      return;
    }
    this.items = items;
    if (clear) {
      this.clear();
    }
    this._rerenderList();
  }
  
  _rerenderList() {
    this.filteredItems = this._filterItemsBy(this.query);
    this.renderQueue = [ ...this.filteredItems ];
    this._renderList(this.renderQueue.splice(0, this.params.elementsWhenFirstRender));
  }
  
  setItemTitleComputer(title) {
    if (!['string', 'function'].includes(typeof title)) {
      console.warn('Title must be a function or string');
      return;
    }
    this.params.itemTitle = title;
  }
  
  _getItemTitle(item) {
    if (typeof this.params.itemTitle === 'string') {
      return String(_v(item, this.params.itemTitle));
    } else {
      try {
        return String(this.params.itemTitle(item));
      } catch (e) {
        return String(item);
      }
    }
  }
  
  _initStyles() {
    const css = `
      * {
        box-sizing: border-box;
      }

      .hoverable:hover {
        background-color: #1E90FF !important;
        color: white !important;
      }

      .dropdown {
        box-shadow: 2px 2px 5px 0px rgba(0,0,0,0.3);
        border: 1px solid #737373;
        max-height: 200px;
      }

      .dropdown > .list-item {
        cursor: default;
      }

      .dropdown > .list-item.one-line {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .dropdown > .list-item.chosen {
        color: #1E90FF;
      }

      .dropdown.hidden {
        display: none;
      }
    `;
    const style = document.createElement('style');
    style.type = 'text/css';
    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }
    return style;
  }
  
  _createContainer() {
    const el = document.createElement('div');
    el.classList.add('container');
    const css = {
      position: 'relative'
    };
    return applyStyles(el, css);
  }
  
  _createDropdown() {
    const el = document.createElement('div');
    el.classList.add('dropdown');
    el.classList.add('hidden');
    const css = {
      overflowY: 'auto',
      position: 'absolute',
      top: '100%',
      left: '0px',
      width: '100%'
    };
    return applyStyles(el, css);
  }
  
  _createInput() {
    const el = document.createElement('input');
    if (this.params.placeholder) {
      el.setAttribute('placeholder', this.params.placeholder);
    }
    el.classList.add('input');
    const css = {
      width: '100%'
    };
    return applyStyles(el, css);
  }
  
  _filterItemsBy(query) {
    if (query.length < this.params.filterStart) return this.items;
    return this.items.filter(x => 
        this._getItemTitle(x)
          .toLowerCase()
          .indexOf(query.toLowerCase()) !== -1);
  }
  
  _getParams() {
    this.params.itemTitle = this.getAttribute('item-title');
    this.params.itemId = this.getAttribute('item-id');
    this.params.filterStart = this.getAttribute('item-id') || 3;
    this.params.placeholder = this.getAttribute('placeholder') || '';
    
    this.params.elementsWhenFirstRender = Number(this.getAttribute('els-when-first-render')) || 50;
    this.params.elementsToAddAfter = Number(this.getAttribute('els-to-add-after')) || 25;
    
    const oneLine = this.getAttribute('one-line');
    this.params.oneLine = (oneLine === '' || Boolean(oneLine));
  }
  
  _listItemHandleClick(itemList, itemDOM) {
    return () => {
      this._clearChosen();
      itemDOM.classList.add('chosen');
      const valueBefore = this.value;
      this.setValue(_v(itemList, this.params.itemId));
      this.closeDropdown();
      this._dispatchEvent(this.refs.input, 'value-input', {
        valueBefore, 
        value: this.value,
        itemOfValue: itemList
      });
    };
  }
  
  _updateQuery(newValue) {
    this.refs.input.value = newValue;
    this.query = newValue;
    this._rerenderList();
  }
  
  _generateList(list) {
    return list.map(item => {
      const itemDOM = document.createElement('div');
      itemDOM.setAttribute('class', 'list-item hoverable');
      this.value === _v(item, this.params.itemId) && itemDOM.classList.add('chosen');
      this.params.oneLine && itemDOM.classList.add('one-line');
      itemDOM.innerHTML = this._getItemTitle(item);
      itemDOM.addEventListener('click', this._listItemHandleClick(item, itemDOM));
      return itemDOM;
    });
  }
  
  _renderList(list) {
    this.refs.dropdown.innerHTML = '';
    this._generateList(list).map(x => this.refs.dropdown.append(x));
  }
  
  _addRenderList(list) {
    this._generateList(list).map(x => this.refs.dropdown.append(x));
  }
  
  _clickOutsideHandler() {
    this.closeDropdown();
  }
  
  setCustomStyles(css) {
    this.refs.style.innerHTML = css;
  }
  
  openDropdown() {
    this.refs.dropdown.classList.remove('hidden');
  }
  
  closeDropdown() {
    this.refs.dropdown.classList.add('hidden');
  }
  
  isDropdownOpened() {
    return !this.refs.dropdown.classList.contains('hidden');
  }
  
  _dispatchEvent(el, eventType, payload) {
    el.dispatchEvent(new CustomEvent(eventType, {
      bubbles: true,
      composed: true,
      detail: payload
    }));
  }
  
  _scrollReachesBottomHandler() {
    if (this.renderQueue.length > 0) {
      this._addRenderList(this._shiftRenderQueue());
      this._dispatchEvent(this.refs.dropdown, 'render-queue-shift', {
        renderQueue: this.renderQueue,
        parent: this.refs.dropdown
      });
    }
  }
  
  connectedCallback() {
    this._getParams();
    
    const shadow = this.attachShadow({mode: 'open'});
    this.refs.style = this._initStyles();
    
    this.refs.container = this._createContainer();
    this.refs.dropdown = this._createDropdown();
    this.refs.input = this._createInput();
    
    this.refs.container.addEventListener('click', (event) => {
      event.stopPropagation();
      this.openDropdown();
      window.addEventListener('click', this._clickOutsideHandler.bind(this), {
        once: true
      });
    });
    
    this.refs.dropdown.addEventListener('click', (event) => event.stopPropagation());
    
    this.refs.input.addEventListener('input', (event) => {
      const valueBefore = this.query;
      this._updateQuery(event.target.value);
      this._dispatchEvent(this.refs.input, 'query-input', {
        nativeEvent: event,
        valueBefore, 
        value: this.query,
        items: this.items,
        filteredItems: this.filteredItems
      });
    });
    
    this.refs.dropdown.addEventListener('scroll', (event) => {
      if (this.refs.dropdown.clientHeight === (this.refs.dropdown.scrollHeight - this.refs.dropdown.scrollTop)) {
        this._scrollReachesBottomHandler();
      }
    });
    
    this.refs.container.append(this.refs.input, this.refs.dropdown);
    shadow.append(this.refs.style, this.refs.container);
  }
}

customElements.define('auto-complete', Autocomplete);
