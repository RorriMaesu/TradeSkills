<div align="center">
  <img src="assets/images/blueHeroBackground.png" width="100%" height="auto" style="background-color:white" alt="TradeSkills Hero Image">

  <div style="background-color: white; color: black; padding: 20px; border-radius: 10px;">

# TradeSkills

A platform for listing, trading, and exchanging skills and services.

<img src="assets/images/capitalismSucksButiHaveAlwaysBeenReallyPassionateAboutAffordingFood.png" alt="TradeSkills Logo" width="150px"/>

  </div>
</div>

<table width="100%" bgcolor="white" style="background-color: white; color: black;">
<tr>
<td>

## Description

TradeSkills is a web application that allows users to list their skills, services, or items they want to trade or offer to others. Users can create listings, browse available offerings, and contact other users to arrange trades or purchases.

## Features

- User authentication (email/password and Google sign-in)
- Create, update, and delete listings
- Upload images for listings
- Browse and search listings with filters
- User dashboard to manage listings
- Responsive design for all device sizes

## Technologies Used

<div>
<img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5"/>
<img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3"/>
<img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript"/>
<img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase"/>
</div>

- Firebase Authentication
- Firebase Firestore (database)
- Firebase Storage (image uploads)

## Getting Started

Visit the live site at [rorrimaesu.github.io/TradeSkills](https://rorrimaesu.github.io/TradeSkills/) to use the application.

### For Development

1. Clone this repository
2. Open the project in your preferred code editor
3. Set up a Firebase project with Authentication, Firestore, and Storage
4. Update the Firebase configuration in `scripts/firebase-config.js`
5. Use a local server to run the project (e.g., Live Server VS Code extension)

### Firestore Indexes

The application uses client-side sorting to avoid requiring Firestore composite indexes. However, for optimal performance in production, you should create the following indexes in your Firebase console:

1. **Listings Collection**:
   - Fields: `userId` (Ascending), `createdAt` (Descending)
   - Query scope: Collection
   - [Create this index](https://console.firebase.google.com/v1/r/project/tradeskills-75c84/firestore/indexes?create_composite=ClJwcm9qZWN0cy90cmFkZXNraWxscy03NWM4NC9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvbGlzdGluZ3MvaW5kZXhlcy9fEAEaCgoGdXNlcklkEAEaDQoJY3JlYXRlZEF0EAIaDAoIX19uYW1lX18QAg)

2. **Trades Collection (Proposer)**:
   - Fields: `proposerId` (Ascending), `createdAt` (Descending)
   - Query scope: Collection
   - [Create this index](https://console.firebase.google.com/v1/r/project/tradeskills-75c84/firestore/indexes?create_composite=ClBwcm9qZWN0cy90cmFkZXNraWxscy03NWM4NC9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvdHJhZGVzL2luZGV4ZXMvXxABGg4KCnByb3Bvc2VySWQQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC)

3. **Trades Collection (Receiver)**:
   - Fields: `receiverId` (Ascending), `createdAt` (Descending)
   - Query scope: Collection
   - [Create this index](https://console.firebase.google.com/v1/r/project/tradeskills-75c84/firestore/indexes?create_composite=ClBwcm9qZWN0cy90cmFkZXNraWxscy03NWM4NC9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvdHJhZGVzL2luZGV4ZXMvXxABGg4KCnJlY2VpdmVySWQQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC)

Note: The application will work without these indexes, but you'll see warnings in the console, and performance may be affected for large datasets.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Author

- [RorriMaesu](https://github.com/RorriMaesu)

## Support My Work

<div align="center">
If you find this project helpful or valuable, you can support me by clicking on the link below:

<a href="https://www.buymeacoffee.com/rorrimaesu" target="_blank">
  <img src="assets/images/capitalismSucksButiHaveAlwaysBeenReallyPassionateAboutAffordingFood.png" alt="Buy Me A Coffee" width="200px" style="border-radius: 5px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
</a>
</div>

</td>
</tr>
</table>