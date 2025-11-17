CREATE VIEW EventTicketDetails AS
SELECT 
    e.event_id,
    e.title AS event_title,
    v.venue_name,
    s.section_name,
    st.row_num,
    st.seat_number,
    t.ticket_status,
    t.ticket_price
FROM Ticket t
JOIN Seat st ON t.seat_id = st.seat_id
JOIN Section s ON st.section_id = s.section_id
JOIN Event_ e ON t.event_id = e.event_id
JOIN Venue v ON e.venue_id = v.venue_id;

CREATE VIEW HighPricedEvents AS
SELECT 
    e.event_id,
    e.title AS event_title,
    AVG(t.ticket_price) AS avg_event_price
FROM Event_ e
JOIN Ticket t ON e.event_id = t.event_id
GROUP BY e.event_id, e.title
HAVING AVG(t.ticket_price) > ANY (
    SELECT AVG(t2.ticket_price)
    FROM Ticket t2
    JOIN Event_ e2 ON t2.event_id = e2.event_id
    GROUP BY e2.event_id
);

CREATE VIEW EventSales AS
SELECT 
    e.event_id,
    e.title,
    (
        SELECT COUNT(*)
        FROM Ticket t
        WHERE t.event_id = e.event_id AND t.ticket_status = 'Sold'
    ) AS tickets_sold
FROM Event_ e;

CREATE VIEW FullEventPayments AS
SELECT 
    e.event_id,
    e.title AS event_title,
    o.order_id,
    p.payment_amount,
    p.payment_status
FROM Event_ e
LEFT JOIN Ticket t ON e.event_id = t.event_id
LEFT JOIN Orders o ON t.order_id = o.order_id
LEFT JOIN Payment p ON p.order_id = o.order_id

UNION

SELECT 
    e.event_id,
    e.title AS event_title,
    o.order_id,
    p.payment_amount,
    p.payment_status
FROM Event_ e
RIGHT JOIN Ticket t ON e.event_id = t.event_id
RIGHT JOIN Orders o ON t.order_id = o.order_id
RIGHT JOIN Payment p ON p.order_id = o.order_id;

CREATE VIEW DBUsers AS
SELECT
    users_name,
    email,
    user_role
FROM Users
WHERE user_role = 'Organizer'

UNION

SELECT
    u.users_name,
    u.email,
    u.user_role
FROM Users u
JOIN Orders o ON u.users_id = o.users_id;

CREATE VIEW OrganizerRevenue AS
SELECT 
    o.organizer_id,
    u.users_name AS organizer_name,
    COUNT(t.ticket_id) AS total_tickets_sold,
    SUM(p.payment_amount) AS total_revenue
FROM Organizer o
JOIN Users u ON o.organizer_id = u.users_id
JOIN Event_ e ON e.organizer_id = o.organizer_id
JOIN Ticket t ON t.event_id = e.event_id
LEFT JOIN Orders ord ON t.order_id = ord.order_id
LEFT JOIN Payment p ON p.order_id = ord.order_id
WHERE t.ticket_status = 'Sold'
GROUP BY o.organizer_id, u.users_name;

CREATE VIEW CustomerOrders AS
SELECT 
    u.users_name AS customer_name,
    o.order_id,
    o.order_date,
    o.order_amount,
    o.order_status
FROM Orders o
JOIN Users u ON o.users_id = u.users_id
WHERE u.user_role = 'Customer';

CREATE VIEW UpcomingPerformances AS
SELECT 
    e.event_id,
    e.title,
    e.start_time,
    p.performer_name,
    p.genre,
    v.venue_name
FROM Event_ e
JOIN Event_Performer ep ON e.event_id = ep.event_id
JOIN Performer p ON ep.performer_id = p.performer_id
JOIN Venue v ON e.venue_id = v.venue_id
WHERE e.event_status = 'Scheduled';

CREATE VIEW EventCategories AS
SELECT 
    c.category_name,
    e.title AS event_title,
    v.venue_name,
    e.start_time
FROM Event_Category ec
JOIN Category c ON ec.category_id = c.category_id
JOIN Event_ e ON ec.event_id = e.event_id
JOIN Venue v ON e.venue_id = v.venue_id
ORDER BY c.category_name, e.start_time;

CREATE VIEW UnreadNotifications AS
SELECT 
    n.notification_id,
    u.users_name,
    e.title AS event_title,
    n.notification_message,
    n.date_sent
FROM Notif n
JOIN Users u ON n.users_id = u.users_id
JOIN Event_ e ON n.event_id = e.event_id
WHERE n.notification_status = 'Unread';

select * from HighPricedEvents;
select * from EventTicketDetails;
select * from EventSales;
select * from FullEventPayments;
select * from DBUsers;
select * from OrganizerRevenue;
select * from CustomerOrders;
select * from UpcomingPerformances;
select * from EventCategories;
select * from UnreadNotifications;