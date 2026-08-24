# SafiRooms app

SafiRooms Web App – Master Prompt for Lovable AI



Build a modern, mobile-first web application called SafiRooms. The system should have two separate interfaces:



1. Client Portal (public)

2. Admin Dashboard (private)



The Admin Dashboard must control everything displayed in the Client Portal. Whenever the admin creates, edits, or deletes a listing, the changes should appear instantly on the client side.



Client Portal



When a client receives a WhatsApp link and opens it, they should see a clean and fast interface with the following filters:



- Single Rooms

- Double Rooms

- Self-Contained Rooms

- Apartments

- Business Rooms

- Search by Location

- Search by Rent Price Range



The client should be able to combine filters (for example: Self-Contained + Soroti + Under 300,000 UGX).



Each listing should display:



- Safi Verified Listing

- Date Posted

- Rent Amount (UGX)

- Deposit (UGX)

- Location

- Description

- Available/Occupied Status

- Room Photos (multiple)

- Amenities (Water, Electricity, Parking, Security, etc.)



At the bottom of every listing, include a large green Call Now button that calls:



+256 765 597 471



The Call Now button should also support WhatsApp.



Admin Dashboard



The admin should log in securely.



The dashboard must allow the admin to:



- Add new listings

- Edit listings

- Delete listings

- Mark rooms as Occupied or Available

- Upload multiple photos

- Select room category

- Enter rent amount

- Enter deposit

- Enter location

- Enter description

- Add amenities

- Set posting date

- Feature important listings

- Archive old listings



Changes should update the Client Portal automatically.



Dashboard Statistics



Show live statistics:



- Total Listings

- Available Rooms

- Occupied Rooms

- Featured Listings

- Today's Views

- Total Calls

- WhatsApp Clicks



Search & Filtering



Clients should instantly search by:



- Room Type

- Location

- Minimum Price

- Maximum Price

- Keyword



Extra Features



Include:



- Featured Listings section

- New Today section

- Recently Updated section

- Similar Rooms recommendations

- Fast loading

- Mobile responsive

- Dark and Light Mode

- SEO friendly

- Secure Admin Login



Future Expansion



Design the system so future features can easily be added, including:



- Multiple agents

- Landlord accounts

- Room scouts/referrers

- Client favourites

- Booking appointments

- Google Maps location

- Analytics dashboard

- SMS and WhatsApp notifications

- Automatic listing expiry reminders



Design



Use a modern green, white, and blue color theme inspired by property platforms.



The interface should be simple enough for anyone to use on a phone.



Technology



Use:



- React

- Next.js

- Tailwind CSS

- Supabase (Authentication, Database and Storage)

- Responsive Design

- Fast image loading

- Clean reusable code

- Secure authentication

- Scalable architecture



The code should be production-ready, well documented, and easy to maintain.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://safi-rooms-listings.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/24157387-c432-4284-a17a-58960470b54d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
