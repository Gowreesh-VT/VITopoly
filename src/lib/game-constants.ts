export const BASE_PROPERTIES = [

  // 🟦 Academic Blocks
  { name: 'AB1', baseValue: 1400, rentValue: 220, group: 'Academic Blocks', houseValue: 440, hotelValue: 760, houseRent: 500, hotelRent: 950, placeRent: 220 },
  { name: 'AB2', baseValue: 1600, rentValue: 260, group: 'Academic Blocks', houseValue: 520, hotelValue: 880, houseRent: 600, hotelRent: 1100, placeRent: 260 },
  { name: 'AB4', baseValue: 1800, rentValue: 300, group: 'Academic Blocks', houseValue: 575, hotelValue: 1000, houseRent: 700, hotelRent: 1250, placeRent: 300 },
  { name: 'AB5', baseValue: 2000, rentValue: 340, group: 'Academic Blocks', houseValue: 640, hotelValue: 1120, houseRent: 800, hotelRent: 1450, placeRent: 340 },

  // 🟪 Amphitheatres
  { name: 'MBA Amphi', baseValue: 2400, rentValue: 380, group: 'Amphitheatre', houseValue: 760, hotelValue: 1320, houseRent: 850, hotelRent: 1700, placeRent: 380 },
  { name: 'AB1 Amphi', baseValue: 2200, rentValue: 350, group: 'Amphitheatre', houseValue: 700, hotelValue: 1230, houseRent: 800, hotelRent: 1600, placeRent: 350 },
  { name: 'AB3 Amphi', baseValue: 2600, rentValue: 420, group: 'Amphitheatre', houseValue: 830, hotelValue: 1450, houseRent: 950, hotelRent: 1900, placeRent: 420 },

  // 🟩 Hostel Blocks
  { name: 'Hostel Block A', baseValue: 1900, rentValue: 300, group: 'Hostel', houseValue: 600, hotelValue: 1060, houseRent: 650, hotelRent: 1300, placeRent: 300 },
  { name: 'Hostel Block B', baseValue: 2000, rentValue: 320, group: 'Hostel', houseValue: 640, hotelValue: 1120, houseRent: 700, hotelRent: 1400, placeRent: 320 },
  { name: 'Hostel Block C', baseValue: 2200, rentValue: 360, group: 'Hostel', houseValue: 700, hotelValue: 1230, houseRent: 800, hotelRent: 1600, placeRent: 360 },
  { name: 'Hostel Block D', baseValue: 2100, rentValue: 340, group: 'Hostel', houseValue: 670, hotelValue: 1175, houseRent: 750, hotelRent: 1500, placeRent: 340 },
  { name: 'Hostel Block E', baseValue: 2300, rentValue: 380, group: 'Hostel', houseValue: 735, hotelValue: 1290, houseRent: 850, hotelRent: 1700, placeRent: 380 },

  // 🟥 Food Street
  { name: 'V Mart', baseValue: 2400, rentValue: 420, group: 'Food Street', houseValue: 760, hotelValue: 1320, houseRent: 900, hotelRent: 1800, placeRent: 420 },
  { name: 'Gazebo', baseValue: 2600, rentValue: 450, group: 'Food Street', houseValue: 830, hotelValue: 1450, houseRent: 1000, hotelRent: 2000, placeRent: 450 },
  { name: 'Gymkhana', baseValue: 2800, rentValue: 480, group: 'Food Street', houseValue: 900, hotelValue: 1570, houseRent: 1100, hotelRent: 2200, placeRent: 480 },
  { name: 'Hunger', baseValue: 2500, rentValue: 430, group: 'Food Street', houseValue: 800, hotelValue: 1400, houseRent: 950, hotelRent: 1900, placeRent: 430 },
  { name: 'NS', baseValue: 2900, rentValue: 500, group: 'Food Street', houseValue: 930, hotelValue: 1620, houseRent: 1200, hotelRent: 2300, placeRent: 500 },

  // 🟧 Auditoriums (Premium)
  { name: 'MG', baseValue: 3200, rentValue: 520, group: 'Auditorium', houseValue: 1020, hotelValue: 1790, houseRent: 1200, hotelRent: 2400, placeRent: 520 },
  { name: 'Kamaraj', baseValue: 3400, rentValue: 560, group: 'Auditorium', houseValue: 1090, hotelValue: 1900, houseRent: 1300, hotelRent: 2600, placeRent: 560 },
  { name: 'Netaji', baseValue: 3600, rentValue: 600, group: 'Auditorium', houseValue: 1150, hotelValue: 2020, houseRent: 1400, hotelRent: 2800, placeRent: 600 },

];

export const AUCTION_TOKENS_CATALOG = [
    {
        name: 'Academic Boost',
        description: 'Increase value of all your academic properties by +20% during final scoring.',
        type: 'ACADEMIC_BOOST',
    },
    {
        name: 'Prime Sabotage',
        description: 'Reduce one opponent\'s highest-value property by 30% during final scoring.',
        type: 'PRIME_SABOTAGE',
    },
    {
        name: 'Finance Boost',
        description: 'Treat your credit score as +15 higher for scoring purposes.',
        type: 'FINANCE_BOOST',
    },
    {
        name: 'Penalty Shield',
        description: 'Ignore one negative effect (default, penalty, tax) in final scoring.',
        type: 'SHIELD',
    },
];

export const GAME_CONFIG = {
    PASS_GO_REWARD: 2500,
    JAIL_FINE: 0,
    CURRENCY_SYMBOL: '₹',
};
