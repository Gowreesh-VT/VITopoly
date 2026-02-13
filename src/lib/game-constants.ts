export const BASE_PROPERTIES = [
    { name: 'Main Gate', baseValue: 1000, rentValue: 100, group: 'Start' },
    { name: 'Gazebo', baseValue: 1500, rentValue: 150, group: 'Hangout' },
    { name: 'Rock Plaza', baseValue: 1500, rentValue: 150, group: 'Hangout' },
    { name: 'Anna Audi', baseValue: 2000, rentValue: 200, group: 'Academic' },
    { name: 'SJT', baseValue: 2500, rentValue: 250, group: 'Academic' },
    { name: 'TT', baseValue: 2500, rentValue: 250, group: 'Academic' },
    { name: 'MB', baseValue: 3000, rentValue: 300, group: 'Academic' },
    { name: 'GDN', baseValue: 3000, rentValue: 300, group: 'Academic' },
    { name: 'Library', baseValue: 3500, rentValue: 350, group: 'Academic' },
    { name: 'SMV', baseValue: 3500, rentValue: 350, group: 'Academic' },
    { name: 'CB', baseValue: 4000, rentValue: 400, group: 'Academic' },
    { name: 'AB1', baseValue: 4500, rentValue: 450, group: 'Academic' },
    { name: 'AB2', baseValue: 4500, rentValue: 450, group: 'Academic' },
    { name: 'AB3', baseValue: 5000, rentValue: 500, group: 'Academic' },
    { name: 'Foodys', baseValue: 2000, rentValue: 200, group: 'Food' },
    { name: 'PRP', baseValue: 2000, rentValue: 200, group: 'Food' },
    { name: 'Enzo', baseValue: 2500, rentValue: 250, group: 'Food' },
    { name: 'Dominos', baseValue: 2500, rentValue: 250, group: 'Food' },
    { name: 'Hostel Block A', baseValue: 1000, rentValue: 100, group: 'Hostel' },
    { name: 'Hostel Block B', baseValue: 1000, rentValue: 100, group: 'Hostel' },
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
