export const BASE_PROPERTIES = [
    { name: 'Main Gate', baseValue: 1000, rentValue: 100, group: 'Start', houseValue: 500, hotelValue: 1500, houseRent: 200, hotelRent: 500, placeRent: 100 },
    { name: 'Gazebo', baseValue: 1500, rentValue: 150, group: 'Hangout', houseValue: 750, hotelValue: 2250, houseRent: 300, hotelRent: 750, placeRent: 150 },
    { name: 'Rock Plaza', baseValue: 1500, rentValue: 150, group: 'Hangout', houseValue: 750, hotelValue: 2250, houseRent: 300, hotelRent: 750, placeRent: 150 },
    { name: 'Anna Audi', baseValue: 2000, rentValue: 200, group: 'Academic', houseValue: 1000, hotelValue: 3000, houseRent: 400, hotelRent: 1000, placeRent: 200 },
    { name: 'SJT', baseValue: 2500, rentValue: 250, group: 'Academic', houseValue: 1250, hotelValue: 3750, houseRent: 500, hotelRent: 1250, placeRent: 250 },
    { name: 'TT', baseValue: 2500, rentValue: 250, group: 'Academic', houseValue: 1250, hotelValue: 3750, houseRent: 500, hotelRent: 1250, placeRent: 250 },
    { name: 'MB', baseValue: 3000, rentValue: 300, group: 'Academic', houseValue: 1500, hotelValue: 4500, houseRent: 600, hotelRent: 1500, placeRent: 300 },
    { name: 'GDN', baseValue: 3000, rentValue: 300, group: 'Academic', houseValue: 1500, hotelValue: 4500, houseRent: 600, hotelRent: 1500, placeRent: 300 },
    { name: 'Library', baseValue: 3500, rentValue: 350, group: 'Academic', houseValue: 1750, hotelValue: 5250, houseRent: 700, hotelRent: 1750, placeRent: 350 },
    { name: 'SMV', baseValue: 3500, rentValue: 350, group: 'Academic', houseValue: 1750, hotelValue: 5250, houseRent: 700, hotelRent: 1750, placeRent: 350 },
    { name: 'CB', baseValue: 4000, rentValue: 400, group: 'Academic', houseValue: 2000, hotelValue: 6000, houseRent: 800, hotelRent: 2000, placeRent: 400 },
    { name: 'AB1', baseValue: 4500, rentValue: 450, group: 'Academic', houseValue: 2250, hotelValue: 6750, houseRent: 900, hotelRent: 2250, placeRent: 450 },
    { name: 'AB2', baseValue: 4500, rentValue: 450, group: 'Academic', houseValue: 2250, hotelValue: 6750, houseRent: 900, hotelRent: 2250, placeRent: 450 },
    { name: 'AB3', baseValue: 5000, rentValue: 500, group: 'Academic', houseValue: 2500, hotelValue: 7500, houseRent: 1000, hotelRent: 2500, placeRent: 500 },
    { name: 'Foodys', baseValue: 2000, rentValue: 200, group: 'Food', houseValue: 1000, hotelValue: 3000, houseRent: 400, hotelRent: 1000, placeRent: 200 },
    { name: 'PRP', baseValue: 2000, rentValue: 200, group: 'Food', houseValue: 1000, hotelValue: 3000, houseRent: 400, hotelRent: 1000, placeRent: 200 },
    { name: 'Enzo', baseValue: 2500, rentValue: 250, group: 'Food', houseValue: 1250, hotelValue: 3750, houseRent: 500, hotelRent: 1250, placeRent: 250 },
    { name: 'Dominos', baseValue: 2500, rentValue: 250, group: 'Food', houseValue: 1250, hotelValue: 3750, houseRent: 500, hotelRent: 1250, placeRent: 250 },
    { name: 'Hostel Block A', baseValue: 1000, rentValue: 100, group: 'Hostel', houseValue: 500, hotelValue: 1500, houseRent: 200, hotelRent: 500, placeRent: 100 },
    { name: 'Hostel Block B', baseValue: 1000, rentValue: 100, group: 'Hostel', houseValue: 500, hotelValue: 1500, houseRent: 200, hotelRent: 500, placeRent: 100 },
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
