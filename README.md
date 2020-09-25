# Autocomplete

Добавляет новый ui компонент для браузера без фреймворков и прочего

## Демо

![Demo](demo.gif)

## Особенности

- 0 зависимостей
- Используется Shadow DOM

## Установка

Устанавливать ничего не нужно, просто скачайте файл autocomplete.js и сделайте импорт.
```js
import './autocomplete.js';
```

Еще можно подключить к странице так:
```html
<script src="https://cdn.jsdelivr.net/gh/yungvldai/autocomplete/autocomplete.min.js"></script>
```

## Использование

```html
<div id="app">
  <auto-complete id="auto"></auto-complete>
</div>
```

```js
const auto = querySelector('#auto');

fetch('https://jsonplaceholder.typicode.com/todos')
  .then(response => response.json())
  .then(json => auto.setItems(json /* массив! */))
```

**auto.setItems()**

Очевидно, что нам нужны какие-то исходные объекты, которые мы будем фильтровать и выбирать. Первым аргументом эта функция принимает массив таких объектов, а вторым `Boolean` значение нужна ли очистка перед применением новых объектов. Обычно она не нужна, но если Вы соберетесь использовать один и тот же автокомплит для двух разных массивов элементов, желательно сделать это.

**item-id** и **item-title**

Однако, после этого вы увидите в списке `[object Object]`, потому что нет настройки отображения. Для этого есть атрибуты `item-id` и `item-title`.

Допустим у меня каждый объект в массиве имеет примерно такую структуру:
```js
{
  data: {
    code: '<уникальный идентификатор объекта>',
    meta: {
      info: {
        name: '<имя объекта>'
      }
    }
  }
}
```

Тогда нужно установить `item-id="data.code"`, а `item-title="data.meta.info.name"`. Теперь объекты будут корректно отображаться в списке, а при выборе в `value` автокомплита будет записываться именно `data.code`.

**auto.setItemTitleComputer()**

Также, Вы можете вызвать функцию `auto.setItemTitleComputer` и передать первым аргументом либо строку, либо функцию. В случае со строкой произойдет то же самое, что и если бы Вы просто установили атрибут. Но можно передать функцию, она будет вызываться для каждого элемента в списке.

Например:
```js
(x) => `${x.data.code}: ${x.data.meta.name}`
```

Будет строить строковое представление объекта как `<уникальный идентификатор объекта>: <имя объекта>`.

**auto.setCustomStyles()**

Мы разобрались с красивым отображением объектов, но как быть с самим компонентом? 
Можно передать строкой стили для теневого DOM.

По-умолчанию там что-то типа того:
```css
* {
  box-sizing: border-box;
}

.hoverable:hover {
  background-color: #1E90FF !important;
  color: white !important;
}

.container {

}

.input {

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
```

Теперь, когда наш автокомплит смотрится круто, не хочется отрывать глаз от выпадающего меню, но и держать в фокусе текстовое поле тоже не хочется, что делать?

**auto.openDropdown()**, **auto.closeDropdown()** и **auto.isDropdownOpened()**

Мы можем управлять выпадающим меню сами, прямо из кода!

**auto.setValue()** и **auto.clear()**

Несмотря на то, что `value` проставляется неявно (когда Вы кликаете по элементу в списке), иногда возникает необходимость установить его программно. Например, в качестве начального значения. Вы можете передать новое значение первым аргументом в `auto.setValue`, и, если оно найдется в `items`, будет установлено. `auto.clear` нужна для сброса значения автокомплита в `null`.

### Некоторые настройки Вы можете установить как атрибуты для элемента

| Атрибут | Описание |
|----------|-------------|
| `item-title` | См. выше |
| `item-id` | См. выше |
| `filter-start` | Минимальная длина строки для фильтрации по ней |
| `placeholder` | Плейсхолдер для текстового поля |
| `one-line` | Запрещаем использовать перенос строк с списке |
| `els-when-first-render` | Кол-во элементов при первом рендере |
| `els-to-add-after` | Кол-во подгружаемых элементов при достижении конца скролла |
| `keep-opened` | Не закрывать выпадающее меню при клике по нему |

### События

| Событие | Описание |
|----------|-------------|
| `value-input` | диспатчится при изменении значения автокомплита |
| `query-input` | диспатчится при изменении значения строки-фильтра |
| `render-queue-shift` | диспатчится при рендере новых элементов из очереди |
