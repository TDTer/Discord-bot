const DISHES = [
  'Phở bò',
  'Phở gà',
  'Cơm tấm sườn',
  'Bún bò Huế',
  'Bún chả',
  'Bánh mì thịt',
  'Hủ tiếu',
  'Mì Quảng',
  'Bánh canh',
  'Cơm gà Hội An',
  'Bún riêu',
  'Bún đậu mắm tôm',
  'Xôi gà',
  'Cháo lòng',
  'Gỏi cuốn',
  'Cơm chiên dương châu',
  'Lẩu Thái',
  'Pizza',
  'Sushi',
  'Ramen',
];

export function getRandomDish() {
  return DISHES[Math.floor(Math.random() * DISHES.length)];
}

export function getAllDishes() {
  return DISHES;
}
