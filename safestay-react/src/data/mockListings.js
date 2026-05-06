/**
 * Seeded property listings for the SafeStay client prototype.
 * Assignment 3: no real HTTP; these mirror future GET /api/listings payloads.
 * Each id is a string to match useParams in React Router.
 */
export const seedListings = () => {
  return [
    {
      id: '1',
      title: 'Bright en-suite room near UCC',
      location: 'Cork City Centre',
      price: 680,
      propertyType: 'Room',
      description:
        'Spacious en-suite, shared kitchen, 10 minutes walk to UCC. Bills included. LGBT+ friendly house.',
      isVerified: true,
      ownerName: 'Mary O’Connell',
      imageHint: 'room-1',
    },
    {
      id: '2',
      title: 'Two-bed apartment — Bishopstown',
      location: 'Bishopstown',
      price: 1200,
      propertyType: 'Apartment',
      description:
        'Furnished two-bed near MTU, parking space, private landlord (references available).',
      isVerified: true,
      ownerName: 'Cian Murphy',
      imageHint: 'apt-1',
    },
    {
      id: '3',
      title: 'Studio — quiet residential street',
      location: 'Wilton',
      price: 950,
      propertyType: 'Studio',
      description:
        'Self-contained studio with own kitchenette. Ideal for a single student, bike storage available.',
      isVerified: false,
      ownerName: 'Sam Lee',
      imageHint: 'studio-1',
    },
    {
      id: '4',
      title: 'Shared house — 4 students',
      location: 'Gurranabraher',
      price: 450,
      propertyType: 'Room',
      description: 'Back bedroom in shared home. No deposit scam — viewings in person only.',
      isVerified: true,
      ownerName: 'Aoife Ryan',
      imageHint: 'house-1',
    },
  ];
};
