SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE Event_Category;
TRUNCATE TABLE Event_Performer;
TRUNCATE TABLE Notif;
TRUNCATE TABLE Payment;
TRUNCATE TABLE Ticket;
TRUNCATE TABLE Orders;
TRUNCATE TABLE Seat;
TRUNCATE TABLE Section;
TRUNCATE TABLE Event_;
TRUNCATE TABLE Organizer;
TRUNCATE TABLE Performer;
TRUNCATE TABLE Category;
TRUNCATE TABLE Venue;
TRUNCATE TABLE Users;

SET FOREIGN_KEY_CHECKS = 1;

-- INSERT USERS

INSERT INTO Users (users_name, email, pwd, user_role) VALUES
('Nabhil Irtisham', 'nabhil.irtisham@gmail.com', 'pwd123', 'Organizer'),
('Vlad Stetca', 'vlad.stetca@gmail.com', 'iloveromania', 'Organizer'),
('Colton Bernas', 'colton.bernas@gmail.com', 'destiny2nerd', 'Customer'),
('Juan Pablo del Rio', 'jpdelrio@gmail.com', 'getmogged', 'Customer'),
('William Afton', 'will.aft@hotmail.com', 'man_b3h1nd_the_s1@ught3r', 'Customer'),
('Papa Louie', 'papa.coolmat@outlook.com', 'pizza!pizza!', 'Organizer'),
('Dexter Morgan', 'dexter.morgan@mmpdmail.com', 'DaRealBHB123', 'Customer');

-- INSERT ORGANIZERS (linked to Users)

INSERT INTO Organizer (organizer_id, organization_name, phone) VALUES
(1, 'Saturn Staging & Events', '416-555-1010'),
(2, 'Energy Productions', '416-555-2020'),
(6, 'FreeFlow Entertainment', '647-555-3030');

-- INSERT VENUES

INSERT INTO Venue (venue_name, loc_address, city, holding_capacity) VALUES
('Metro Arena', '100 King St W', 'Toronto', 10000),
('The Big Bowl', '25 Queens Quay', 'Sydney', 2500),
('Uptown Theater', '10 Dune St', 'Rome', 800),
('Skyline Pavilion', '88 Front St', 'London', 5000),
('John Smith Stadium', '55 Yonge St', 'Shanghai', 12000),
('Crescent Center', '300 Bloor St', 'Berlin', 3000),
('Union Square Amphitheater', '45 Union Ave', 'Los Angeles', 7000);

-- INSERT EVENTS

INSERT INTO Event_ (organizer_id, venue_id, title, event_description, start_time, end_time, standard_price, event_status) VALUES
(1, 1, 'Summer Beats Festival', 'Outdoor music concert', '2025-07-01 18:00:00', '2025-07-01 23:00:00', 120.00, 'Scheduled'),
(2, 2, 'Comedy Night', 'Stand-up comedy showcase', '2025-06-15 19:30:00', '2025-06-15 22:00:00', 75.00, 'Ongoing'),
(1, 3, 'Indie Movie Premiere', 'Exclusive film screening', '2025-08-10 20:00:00', '2025-08-10 23:30:00', 60.00, 'Ongoing'),
(6, 4, 'Jazz Under the Stars', 'Evening of smooth jazz', '2025-09-05 19:00:00', '2025-09-05 23:00:00', 85.00, 'Completed'),
(1, 5, 'Championship Finals', 'Sports event finals', '2025-11-20 16:00:00', '2025-11-20 20:00:00', 150.00, 'Cancelled'),
(2, 6, 'Tech Expo 2025', 'Technology and startup showcase', '2025-10-12 09:00:00', '2025-10-12 17:00:00', 40.00, 'Scheduled'),
(6, 7, 'Food & Wine Gala', 'Gourmet tasting experience', '2025-12-15 18:00:00', '2025-12-15 23:00:00', 110.00, 'Ongoing');

-- INSERT SECTIONS

INSERT INTO Section (venue_id, section_name, seating_capacity) VALUES
(1, 'Floor A', 3000),
(1, 'Balcony', 2000),
(2, 'Main', 1000),
(3, 'Orchestra', 400),
(4, 'VIP', 500),
(5, 'General', 8000),
(6, 'Exhibit Area', 1500);

-- INSERT SEATS

INSERT INTO Seat (section_id, seat_number, row_num) VALUES
(1, 'A1', 'A'),
(1, 'A2', 'A'),
(2, 'B1', 'B'),
(3, 'C1', 'C'),
(4, 'D1', 'D'),
(5, 'E1', 'E'),
(6, 'F1', 'F');

-- INSERT ORDERS

INSERT INTO Orders (users_id, order_amount, order_status) VALUES
(3, 120.00, 'Pending'),
(4, 75.00, 'Paid'),
(5, 60.00, 'Pending'),
(3, 150.00, 'Paid'),
(7, 85.00, 'Refunded'),
(5, 40.00, 'Paid'),
(4, 110.00, 'Pending');

-- INSERT PAYMENTS

INSERT INTO Payment (order_id, payment_method, payment_amount, payment_status) VALUES
(1, 'Credit', 120.00, 'Completed'),
(2, 'Debit', 75.00, 'Completed'),
(3, 'PayPal', 60.00, 'Failed'),
(4, 'Credit', 150.00, 'Completed'),
(5, 'Debit', 85.00, 'Refunded'),
(6, 'Credit', 40.00, 'Completed'),
(7, 'Cash', 110.00, 'Pending');

-- INSERT TICKETS (Linked to Orders for 'Sold')

INSERT INTO Ticket (event_id, seat_id, ticket_price, ticket_status, order_id) VALUES
(1, 1, 120.00, 'Available', NULL),
(1, 2, 120.00, 'Reserved', NULL),
(2, 3, 75.00, 'Sold', 2),
(3, 4, 60.00, 'Available', NULL),
(4, 5, 85.00, 'Sold', 5),
(5, 6, 150.00, 'Sold', 4),
(6, 7, 40.00, 'Reserved', NULL);

-- INSERT PERFORMERS

INSERT INTO Performer (performer_name, genre) VALUES
('DJ Nova', 'Electronic'),
('Luna Beats', 'Pop'),
('Charlie Comet', 'Rock'),
('Amy Fields', 'Jazz'),
('The Laugh Crew', 'Comedy'),
('Orion String Quartet', 'Classical'),
('Spice Harmony', 'Fusion');

-- INSERT CATEGORIES

INSERT INTO Category (category_name, category_description) VALUES
('Music', 'Concerts, festivals, and live performances'),
('Comedy', 'Stand-up and improv shows'),
('Film', 'Movie screenings and premieres'),
('Sports', 'Athletic competitions and games'),
('Technology', 'Tech expos and conferences'),
('Food', 'Culinary events and tastings'),
('Culture', 'Art shows and cultural exhibitions');

-- INSERT NOTIFICATIONS

INSERT INTO Notif (users_id, event_id, notification_message, notification_status) VALUES
(3, 1, 'Your ticket for Summer Beats Festival is confirmed.', 'Unread'),
(4, 2, 'Reminder: Comedy Night tomorrow!', 'Read'),
(5, 3, 'Indie Movie Premiere now open for booking.', 'Read'),
(3, 4, 'Jazz Under the Stars lineup announced.', 'Unread'),
(7, 5, 'Championship Finals tickets available.', 'Read'),
(4, 6, 'Tech Expo 2025 passes released.', 'Unread'),
(5, 7, 'Food & Wine Gala early bird discount!', 'Unread');

-- INSERT EVENT-PERFORMER LINKS

INSERT INTO Event_Performer (event_id, performer_id) VALUES
(1, 1),
(1, 2),
(2, 5),
(3, 3),
(4, 4),
(5, 6),
(7, 7);

-- INSERT EVENT-CATEGORY LINKS

INSERT INTO Event_Category (event_id, category_id) VALUES
(1, 1),
(2, 2),
(3, 3),
(4, 1),
(5, 4),
(6, 5),
(7, 6);

SELECT * FROM Users;
SELECT * FROM Organizer;
SELECT * FROM Venue;
SELECT * FROM Event_;
SELECT * FROM Section;
SELECT * FROM Seat;
SELECT * FROM Orders;
SELECT * FROM Payment;
SELECT * FROM Ticket;
SELECT * FROM Performer;
SELECT * FROM Category;
SELECT * FROM Notif;
SELECT * FROM Event_Performer;
SELECT * FROM Event_Category;