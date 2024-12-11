import Handlebars from 'handlebars';
import { Item } from '../types';

Handlebars.registerHelper(
  'ifCond',
  function (this: any, v1: any, v2: any, options: Handlebars.HelperOptions) {
    return v1 === v2 ? options.fn(this) : options.inverse(this);
  },
);

Handlebars.registerHelper(
  'getItem',
  function (data: Item[], propertyName: keyof Item, propertyValue: string) {
    const item: Item | undefined = data.find(
      (itm) => itm[propertyName] === propertyValue,
    );
    return item;
  },
);

Handlebars.registerHelper('getValueItem', function (item: Item, options: any) {
  const context = options.data.root;
  const measurementUnits = context.measurementUnits;
  if (measurementUnits !== 'IMP') {
    return item.value_sint !== -9999 ? item.value_sint.toString() : '-';
  } else {
    return item.value_simp !== -9999 ? item.value_simp.toString() : '-';
  }
});

Handlebars.registerHelper('getUnitItem', function (item: Item, options: any) {
  const context = options.data.root;
  const measurementUnits = context.measurementUnits;
  return measurementUnits !== 'IMP'
    ? item.units_sint.toString()
    : item.units_simp.toString();
});

Handlebars.registerHelper('adjustWindDir', function (deg: string | number) {
  const degree = parseFloat(deg as string);
  if (isNaN(degree)) return 0;
  return (degree + 180) % 360;
});
