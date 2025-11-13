CREATE TABLE Users(
    users_id INT PRIMARY KEY AUTO_INCREMENT,
    users_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    pwd VARCHAR(255) NOT NULL,
    user_role ENUM('Organizer', 'Customer') NOT NULL,
    date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Organizer(
    organizer_id INT PRIMARY KEY,
    organization_name VARCHAR(100),
    phone VARCHAR(20),
    FOREIGN KEY (organizer_id) REFERENCES Users(users_id) ON DELETE CASCADE
);

CREATE TABLE Venue(
    venue_id INT PRIMARY KEY AUTO_INCREMENT,
    venue_name VARCHAR(100),
    loc_address VARCHAR(200),
    city VARCHAR(50),
    holding_capacity INT CHECK (holding_capacity > 0)
);

CREATE TABLE Event_(
    event_id INT PRIMARY KEY AUTO_INCREMENT,
    organizer_id INT NOT NULL,
    venue_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    event_description TEXT,
    start_time DATETIME,
    end_time DATETIME,
    standard_price DECIMAL(8,2) CHECK (standard_price >= 0),
    event_status ENUM('Scheduled', 'Ongoing', 'Cancelled', 'Completed') DEFAULT 'Scheduled',
    FOREIGN KEY (organizer_id) REFERENCES Organizer(organizer_id) ON DELETE CASCADE,
    FOREIGN KEY (venue_id) REFERENCES Venue(venue_id) ON DELETE RESTRICT
);

CREATE TABLE Section(
    section_id INT PRIMARY KEY AUTO_INCREMENT,
    venue_id INT NOT NULL,
    section_name VARCHAR(40),
    seating_capacity INT CHECK (seating_capacity >= 0),
    FOREIGN KEY (venue_id) REFERENCES Venue(venue_id) ON DELETE CASCADE
);

CREATE TABLE Seat(
    seat_id INT PRIMARY KEY AUTO_INCREMENT,
    section_id INT NOT NULL,
    seat_number VARCHAR(10),
    row_num VARCHAR(10),
    FOREIGN KEY (section_id) REFERENCES Section(section_id) ON DELETE CASCADE
);

CREATE TABLE Orders(
    order_id INT PRIMARY KEY AUTO_INCREMENT,
    users_id INT NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    order_amount DECIMAL(10,2) CHECK (order_amount >= 0),
    order_status ENUM('Pending', 'Paid', 'Refunded', 'Cancelled') DEFAULT 'Pending',
    FOREIGN KEY (users_id) REFERENCES Users(users_id) ON DELETE CASCADE
);

CREATE TABLE Payment(
    payment_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL UNIQUE,
    payment_method ENUM('Credit', 'Debit', 'PayPal', 'Cash') NOT NULL,
    payment_amount DECIMAL(10,2) CHECK (payment_amount >= 0),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_status ENUM('Completed', 'Failed', 'Refunded', 'Pending') DEFAULT 'Completed',
    FOREIGN KEY (order_id) REFERENCES Orders(order_id) ON DELETE CASCADE
);

CREATE TABLE Ticket(
    ticket_id INT PRIMARY KEY AUTO_INCREMENT,
    event_id INT NOT NULL,
    seat_id INT NOT NULL,
    ticket_price DECIMAL(8,2) CHECK (ticket_price >= 0),
    ticket_status ENUM('Available', 'Reserved', 'Sold') DEFAULT 'Available',
    listed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (event_id, seat_id),
    FOREIGN KEY (event_id) REFERENCES Event_(event_id) ON DELETE CASCADE,
    FOREIGN KEY (seat_id) REFERENCES Seat(seat_id) ON DELETE CASCADE
);

ALTER TABLE Ticket
ADD COLUMN order_id INT NULL,
ADD FOREIGN KEY (order_id) REFERENCES Orders(order_id) ON DELETE SET NULL;

CREATE TABLE Performer(
    performer_id INT PRIMARY KEY AUTO_INCREMENT,
    performer_name VARCHAR(70) NOT NULL,
    genre VARCHAR(80)
);

CREATE TABLE Category(
    category_id INT PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(50) NOT NULL,
    category_description TEXT
);

CREATE TABLE Notif(
    notification_id INT PRIMARY KEY AUTO_INCREMENT,
    users_id INT NOT NULL,
    event_id INT NOT NULL,
    notification_message TEXT,
    date_sent TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notification_status ENUM('Unread', 'Read') DEFAULT 'Unread',
    FOREIGN KEY (users_id) REFERENCES Users(users_id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES Event_(event_id) ON DELETE CASCADE
);

CREATE TABLE Event_Performer(
    event_id INT,
    performer_id INT,
    PRIMARY KEY(event_id, performer_id),
    FOREIGN KEY (event_id) REFERENCES Event_(event_id) ON DELETE CASCADE,
    FOREIGN KEY (performer_id) REFERENCES Performer(performer_id) ON DELETE CASCADE
);

CREATE TABLE Event_Category(
    event_id INT,
    category_id INT,
    PRIMARY KEY (event_id, category_id),
    FOREIGN KEY (event_id) REFERENCES Event_(event_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES Category(category_id) ON DELETE CASCADE
);