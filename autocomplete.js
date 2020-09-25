/**
 * Преобразуем camelCase в kebab-case
 */
const c2k = (string) => 
  string.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

const applyStyles = (el, css) => {
  // пробегаемся по объекту стилей
  for (const [prop, value] of Object.entries(css)) {
    // устанавливаем значения
    el.style[c2k(prop)] = value;
  }
  return el;
}

/**
 * Эта функция нужна для раскрывания цепочек типа prop1.prop2.prop3
 * и получения значения свойства вложенного объекта
 */
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
      filterStart: 3, // список будет фильтроваться, если длина запроса в строке > filterStart
      placeholder: '',
      oneLine: false, // запретить перенос строк в элементах в выпадающем меню
      elementsWhenFirstRender: 50, // кол-во элементов при первичном рендере
      elementsToAddAfter: 25, // добавляем каждый раз, когда достигаем конца
      keepOpened: false // по-умолчанию выпадающее меню скрывается при выборе элемента, можно установить keep-opened в 
      // true и этого не произойдет
    };
    
    /**
     * Сохраняем все наше DOM привязки, чтобы иметь к ним доступ
     */
    this.refs = {
      input: null,
      dropdown: null,
      container: null,
      style: null
    };
    
    this.value = null;
  }
  
  _clearChosen() {
    // у нас есть возможность подсвечивать выбранный элемент в списке (мы добавляем ему класс chosen)
    // эта функция делает обратное: убирает класс chosen у всех элементов списка
    const found = document.querySelectorAll('.dropdown > .list-item.chosen');
    Array.from(found).forEach(x => x.classList.remove('chosen'));
  }
  
  clear() {
    // просто очистка значений
    this.value = null;
    this._updateQuery('');
    this._clearChosen();
  }
  
  setValue(newValue) {
    // мы ищем в items наш выбранный объект по коду
    const found = this.items.find(x => _v(x, this.params.itemId) === newValue);
    if (found) {
      // устанавливаем новое значение и обновляем строку запроса, если найден
      const valueBefore = this.value;
      this.value = newValue;
      this._updateQuery(this._getItemTitle(found));

      // диспатчим событие value-input
      this._dispatchEvent(this.refs.input, 'value-input', {
        valueBefore, 
        value: this.value,
        itemOfValue: found
      });
    } else {
      console.warn('Item not found in presented items array');
    }
  }
  
  _shiftRenderQueue() {
    // берем новые элементы из очереди рендера
    return this.renderQueue.splice(0, this.params.elementsToAddAfter);
  }
  
  setItems(items, clear = false) {
    /**
     * Собственно, передача рабочих items
     * Если мы начинаем работу с принципиально новыми данными, желательно
     * сделать очистку, передав true вторым аргументом
     */
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
    // фильтруем по строке из запроса
    this.filteredItems = this._filterItemsBy(this.query);
    // создаем копию фильтрованных элементов
    this.renderQueue = [ ...this.filteredItems ];
    // и пытаемся отрендерить в DOM первую пачку
    this._renderList(this.renderQueue.splice(0, this.params.elementsWhenFirstRender));
  }
  
  setItemTitleComputer(title) {
    /**
     * Можно передавать item-title не только как атрибут, но и прямо в коде
     * это нужно, чтобы туда можно было передать колбэк, который будет вызываться
     * для каждого элемента с целью вычисления его строкового представления
     */
    if (!['string', 'function'].includes(typeof title)) {
      console.warn('Title must be a function or string');
      return;
    }
    this.params.itemTitle = title;
  }
  
  _getItemTitle(item) {
    /**
     * получаем строковое представления объекта item
     */
    if (typeof this.params.itemTitle === 'string') {
      /**
       * Если item-title - строка, то просто раскрываем вложенный (или нет) объект(-ы) и
       * возвращаем значение запрошенного свойства
       */
      return String(_v(item, this.params.itemTitle));
    } else {
      try {
        /**
         * Если же item-title - функция, то вызываем ее, передавая item первым аргументом.
         */
        return String(this.params.itemTitle(item));
      } catch (e) {
        return String(item);
      }
    }
  }
  
  _initStyles() {
    /**
     * Это стили по-умолчанию, но их можно переопределить
     */
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
    /**
     * создаем элемент со стилями
     */
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
    /**
     * создаем контейнер для нашего автокомплита
     */
    const el = document.createElement('div');
    el.classList.add('container');
    const css = {
      position: 'relative'
    };
    return applyStyles(el, css);
  }
  
  _createDropdown() {
    /**
     * создаем выпадающее меню
     */
    const el = document.createElement('div');
    el.classList.add('dropdown');
    // и сразу прячем его
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
    /**
     * создаем текстовое поле для введения запроса фильтрации
     */
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
    /**
     * тут мы фильтруем items по нашему query.
     * фильтрация произойдет только в случае, если длина query >= filter-start
     * иначе вернется неотфильтрованный массив
     */
    if (query.length < this.params.filterStart) return this.items;
    return this.items.filter(x => 
        this._getItemTitle(x)
          .toLowerCase()
          .indexOf(query.toLowerCase()) !== -1);
  }
  
  _getParams() {
    /**
     * мы получаем переданные элементу атрибуты, они служат для настройки поведения 
     * элемента
     */
    this.params.itemTitle = this.getAttribute('item-title');
    this.params.itemId = this.getAttribute('item-id');
    this.params.filterStart = this.getAttribute('item-id') || 3;
    this.params.placeholder = this.getAttribute('placeholder') || '';
    
    this.params.elementsWhenFirstRender = Number(this.getAttribute('els-when-first-render')) || 50;
    this.params.elementsToAddAfter = Number(this.getAttribute('els-to-add-after')) || 25;
    
    const oneLine = this.getAttribute('one-line');
    this.params.oneLine = (oneLine === '' || Boolean(oneLine));

    const keepOpened = this.getAttribute('keep-opened');
    this.params.keepOpened = (keepOpened === '' || Boolean(keepOpened));
  }
  
  _listItemHandleClick(itemList, itemDOM) {
    /**
     * Эта функция обрабатывает клик по элементу в списке
     * Она устанавливает новое значение, скрывает
     */
    return () => {
      this._clearChosen();
      itemDOM.classList.add('chosen');
      this.setValue(_v(itemList, this.params.itemId));
      !this.params.keepOpened && this.closeDropdown();
    };
  }
  
  _updateQuery(newValue) {
    /**
     * Обновляем строку фильтрации и делаем перерендер для нового фильтра
     */
    this.refs.input.value = newValue;
    this.query = newValue;
    this._rerenderList();
  }
  
  _generateList(list) {
    /**
     * из переданных элементов из items генерируем DOM элементы с нужными настройками
     */
    return list.map(item => {
      const itemDOM = document.createElement('div');
      itemDOM.setAttribute('class', 'list-item hoverable');
      this.value === _v(item, this.params.itemId) && itemDOM.classList.add('chosen');
      this.params.oneLine && itemDOM.classList.add('one-line');
      itemDOM.innerHTML = this._getItemTitle(item);
      /**
       * вешаем слушателя на клик по элементу в списке
       */
      itemDOM.addEventListener('click', this._listItemHandleClick(item, itemDOM));
      return itemDOM;
    });
  }
  
  /**
   * Две функции ниже делают почти одно и то же, но первая предварительно очищает место,
   * куда будут добавляться новые DOM элементы
   */

  _renderList(list) {
    this.refs.dropdown.innerHTML = '';
    this._generateList(list).map(x => this.refs.dropdown.append(x));
  }
  
  _addRenderList(list) {
    this._generateList(list).map(x => this.refs.dropdown.append(x));
  }
  
  /**
   * слушаем клик за автокомплитом, чтобы автоматически закрывыть выпадающее меню
   */
  _clickOutsideHandler() {
    this.closeDropdown();
  }
  
  /**
   * Можно передать строкой CSS, чтобы переопределить стили для элементов
   */
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
  
  /**
   * обрабатываем достижение конца скролла
   */
  _scrollReachesBottomHandler() {
    /**
     * Если в очереди на рендер что-то есть, добавляем эти элементы в список
     */
    if (this.renderQueue.length > 0) {
      this._addRenderList(this._shiftRenderQueue());
      this._dispatchEvent(this.refs.dropdown, 'render-queue-shift', {
        renderQueue: this.renderQueue,
        parent: this.refs.dropdown
      });
    }
  }
  
  connectedCallback() {
    /**
     * получаем параметы (атрибуты)
     */
    this._getParams();
    
    const shadow = this.attachShadow({mode: 'closed'});

    /**
     * Создаем элементы из которых будет состоять компонент
     */
    this.refs.style = this._initStyles();
    this.refs.container = this._createContainer();
    this.refs.dropdown = this._createDropdown();
    this.refs.input = this._createInput();
    
    /**
     * при клике куда угодно в контейнере (кроме выпадающего меню (см. далее)) будет открываться выпадающее меню,
     * если оно еще не открыто
     */
    this.refs.container.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!this.isDropdownOpened()) {
        this.openDropdown();
        window.addEventListener('click', this._clickOutsideHandler.bind(this), {
          once: true // обработчик вызовется один раз, потом автоматически удалится
        });
      }
    });
    
    /**
     * это нужно, чтобы window не ловил клики по выпадающему меню
     */
    this.refs.dropdown.addEventListener('click', (event) => event.stopPropagation());
    
    /**
     * пытаемся контроллировать и запоминать значение строки-фильтра
     */
    this.refs.input.addEventListener('input', (event) => {
      const valueBefore = this.query;
      this._updateQuery(event.target.value);
      /**
       * диспатчим событие query-input, когда ловим input на this.refs.input
       */
      this._dispatchEvent(this.refs.input, 'query-input', {
        nativeEvent: event,
        valueBefore, 
        value: this.query,
        items: this.items,
        filteredItems: this.filteredItems
      });
    });
    
    this.refs.dropdown.addEventListener('scroll', () => {
      /**
       * проверяем достигли ли мы конца скролла
       */
      if (this.refs.dropdown.clientHeight === (this.refs.dropdown.scrollHeight - this.refs.dropdown.scrollTop)) {
        this._scrollReachesBottomHandler();
      }
    });
    
    /**
     * собираем все воедино
     */
    this.refs.container.append(this.refs.input, this.refs.dropdown);
    shadow.append(this.refs.style, this.refs.container);
  }
}

customElements.define('auto-complete', Autocomplete);
