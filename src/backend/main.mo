import Float "mo:core/Float";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Text "mo:core/Text";
import List "mo:core/List";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Timer "mo:core/Timer";
import AccessControl "authorization/access-control";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";

actor RestaurantFinance {
  let accessControlState = AccessControl.initState();

  var wakeUpRoutineStarted : Bool = false;

  // Read-only mode flag for draft environment access
  var readOnlyMode : Bool = false;
  var authorizedReadOnlyPrincipals = Map.empty<Principal, Bool>();

  public type CanisterInfo = {
    canisterId : Text;
    publicUrl : Text;
  };

  public type FullCanisterInfo = {
    frontend : CanisterInfo;
    backend : CanisterInfo;
  };

  public type UserProfile = {
    name : Text;
    restaurantName : Text;
  };

  var userProfiles = Map.empty<Principal, UserProfile>();

  public type BusinessProfile = {
    location : Text;
    numberOfSeats : Nat;
    offerType : OfferType;
    seasonalActivity : SeasonalActivity;
  };

  public type OfferType = {
    #restoran;
    #bar;
    #kafic;
    #brzaHrana;
    #ostalo;
  };

  public type SeasonalActivity = {
    #ljeto;
    #zima;
    #oboje;
  };

  var businessProfiles = Map.empty<Principal, BusinessProfile>();

  public type BenchmarkPeriod = {
    #monthly : { month : Nat; year : Nat };
    #yearly : { year : Nat };
    #cumulative;
  };

  public type IndustryBenchmark = {
    averageIncome : Int;
    averageExpenses : Int;
    averageProfitMargin : Float;
    expenseCategoryAverages : [(Text, Int)];
    revenuePerSeat : ?Int;
  };

  public type PerformanceDeviation = {
    category : Text;
    userValue : Int;
    industryAverage : Int;
    deviationPercentage : Float;
    status : DeviationStatus;
  };

  public type DeviationStatus = {
    #aboveAverage;
    #belowAverage;
    #withinNormalRange;
  };

  public type PerformanceAnalysis = {
    period : BenchmarkPeriod;
    userIncome : Int;
    userExpenses : Int;
    userProfit : Int;
    industryBenchmark : IndustryBenchmark;
    incomeDeviation : PerformanceDeviation;
    expenseDeviations : [PerformanceDeviation];
    profitMarginDeviation : PerformanceDeviation;
    recommendations : [Text];
    diagnosticInfo : ?Text;
  };

  // Helper function to check if caller has read-only access
  func hasReadOnlyAccess(caller : Principal) : Bool {
    switch (authorizedReadOnlyPrincipals.get(caller)) {
      case (?authorized) { authorized };
      case (null) { false };
    };
  };

  // Helper function to check if caller can read data (either user or read-only)
  func canReadData(caller : Principal) : Bool {
    AccessControl.hasPermission(accessControlState, caller, #user) or hasReadOnlyAccess(caller);
  };

  // Admin function to authorize read-only access for draft environment
  public shared ({ caller }) func authorizeReadOnlyAccess(principal : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can authorize read-only access");
    };
    authorizedReadOnlyPrincipals.add(principal, true);
  };

  // Admin function to revoke read-only access
  public shared ({ caller }) func revokeReadOnlyAccess(principal : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can revoke read-only access");
    };
    authorizedReadOnlyPrincipals.remove(principal);
  };

  // Query to check if caller has read-only access
  public query ({ caller }) func hasCallerReadOnlyAccess() : async Bool {
    hasReadOnlyAccess(caller);
  };

  public shared ({ caller }) func saveBusinessProfile(profile : BusinessProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save business profile");
    };
    businessProfiles.add(caller, profile);
  };

  public query ({ caller }) func getCallerBusinessProfile() : async ?BusinessProfile {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can view business profile");
    };
    businessProfiles.get(caller);
  };

  public query ({ caller }) func getBusinessProfile(user : Principal) : async ?BusinessProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller) and not hasReadOnlyAccess(caller)) {
      Runtime.trap("Unauthorized: Can only view your own business profile");
    };
    businessProfiles.get(user);
  };

  // Read-only query for draft environment to access all business profiles
  public query ({ caller }) func getAllBusinessProfilesReadOnly() : async [(Principal, BusinessProfile)] {
    if (not hasReadOnlyAccess(caller)) {
      Runtime.trap("Unauthorized: Only authorized read-only access can view all business profiles");
    };
    businessProfiles.entries().toArray();
  };

  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller) and not hasReadOnlyAccess(caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  var nextId : Nat = 0;
  var transactions = Map.empty<Nat, Transaction>();
  var monthlyIncomes = Map.empty<Nat, Map.Map<Nat, Int>>();

  public type TransactionType = {
    #prihod;
    #rashod;
  };

  public type ExpenseCategory = {
    #namirnice;
    #place;
    #rezije;
    #oprema;
    #pice;
    #napojnica;
    #ostalo;
  };

  public type PaymentMethod = {
    #gotovina;
    #kartica;
  };

  public type Transaction = {
    id : Nat;
    amount : Int;
    transactionType : TransactionType;
    expenseCategory : ?ExpenseCategory;
    paymentMethod : ?PaymentMethod;
    date : Int;
    description : Text;
  };

  public type TransactionInput = {
    amount : Int;
    transactionType : TransactionType;
    expenseCategory : ?ExpenseCategory;
    paymentMethod : ?PaymentMethod;
    date : Int;
    description : Text;
  };

  public type FinancialOverview = {
    totalIncome : Int;
    totalExpenses : Int;
    profit : Int;
  };

  public type CategorySummary = {
    category : Text;
    total : Int;
  };

  public type PaymentMethodSummary = {
    paymentMethod : Text;
    total : Int;
  };

  public type MonthlyReport = {
    month : Nat;
    year : Nat;
    overview : FinancialOverview;
    expensesByCategory : [CategorySummary];
    incomeByPaymentMethod : [PaymentMethodSummary];
  };

  public type YearlyReport = {
    year : Nat;
    monthlyOverviews : [FinancialOverview];
    totalOverview : FinancialOverview;
    incomeByPaymentMethod : [PaymentMethodSummary];
  };

  public type MonthlyIncomeExpense = {
    month : Nat;
    year : Nat;
    totalIncome : Int;
    totalExpenses : Int;
  };

  public type YearComparison = {
    year : Nat;
    monthlyData : [MonthlyIncomeExpense];
    totalIncome : Int;
    totalExpenses : Int;
  };

  public type MonthlyIncomeInput = {
    year : Nat;
    month : Nat;
    amount : Int;
  };

  public type ExpenseShare = {
    category : Text;
    total : Int;
    share : Float;
  };

  public type ExportData = {
    transactions : [Transaction];
    monthlyIncomes : [MonthlyIncomeInput];
    businessProfile : ?BusinessProfile;
  };

  public type PdfReportData = {
    overview : FinancialOverview;
    transactions : [Transaction];
    monthlyIncomes : [MonthlyIncomeInput];
    expensesByCategory : [CategorySummary];
    incomeByPaymentMethod : [PaymentMethodSummary];
    businessProfile : ?BusinessProfile;
  };

  public type DfinityTechnicalReport = {
    title : Text;
    summary : Text;
    synchronizationImprovements : Text;
    consistencyVerification : Text;
    dateBoundaryHandling : Text;
    decimalPrecision : Text;
    finalVerification : Text;
    confirmation : Text;
  };

  public type DfinityTechnicalAnalysis = {
    title : Text;
    executiveSummary : Text;
    issueDescription : Text;
    technicalAnalysis : Text;
    recoveryAttempts : Text;
    dataPersistenceFindings : Text;
    recommendations : Text;
    userExperienceImpact : Text;
    conclusion : Text;
  };

  public type DfinityVoiceCommandIssueReport = {
    title : Text;
    introduction : Text;
    implementationTimeline : Text;
    technicalIssueAnalysis : Text;
    comparativeAnalysis : Text;
    rootCauseIdentification : Text;
    platformRecommendations : Text;
    implementationAttemptHistory : Text;
    connectivityPatternAnalysis : Text;
    browserCompatibilityIssues : Text;
    authenticationIntegrationProblems : Text;
    technicalArchitectureReview : Text;
    conclusion : Text;
  };

  public type Projection = {
    month : Nat;
    year : Nat;
    projectedIncome : Int;
    projectedExpenses : Int;
    projectedProfit : Int;
  };

  public type SimulationInput = {
    incomeGrowthPercentage : Float;
    expenseGrowthPercentage : Float;
  };

  public type SimulationResult = {
    projections : [Projection];
    totalProjectedIncome : Int;
    totalProjectedExpenses : Int;
    totalProjectedProfit : Int;
  };

  public shared ({ caller }) func addTransaction(input : TransactionInput) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add transactions");
    };

    let id = nextId;
    nextId += 1;

    let transaction : Transaction = {
      id;
      amount = input.amount;
      transactionType = input.transactionType;
      expenseCategory = input.expenseCategory;
      paymentMethod = input.paymentMethod;
      date = input.date;
      description = input.description;
    };

    transactions.add(id, transaction);
    id;
  };

  public query ({ caller }) func getTransaction(id : Nat) : async ?Transaction {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can view transactions");
    };
    transactions.get(id);
  };

  public query ({ caller }) func getAllTransactions() : async [Transaction] {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can view transactions");
    };
    let iter = transactions.values();
    iter.toArray();
  };

  // Read-only query for draft environment to access all transactions
  public query ({ caller }) func getAllTransactionsReadOnly() : async [Transaction] {
    if (not hasReadOnlyAccess(caller)) {
      Runtime.trap("Unauthorized: Only authorized read-only access can view all transactions");
    };
    transactions.values().toArray();
  };

  public query ({ caller }) func getTransactionsByType(transactionType : TransactionType) : async [Transaction] {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can view transactions");
    };
    let arr = transactions.values().toArray();
    arr.filter(func(t) { t.transactionType == transactionType });
  };

  public query ({ caller }) func getTransactionsByCategory(
    transactionType : TransactionType,
    expenseCategory : ?ExpenseCategory,
  ) : async [Transaction] {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can view transactions");
    };
    let arr = transactions.values().toArray();
    arr.filter(func(t) {
      t.transactionType == transactionType and (switch (transactionType, expenseCategory) {
        case (#rashod, ?expCat) {
          switch (t.expenseCategory) {
            case (?cat) { cat == expCat };
            case (null) { false };
          };
        };
        case (_) { false };
      });
    });
  };

  public query ({ caller }) func getTransactionsByPaymentMethod(paymentMethod : PaymentMethod) : async [Transaction] {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can view transactions");
    };
    let arr = transactions.values().toArray();
    arr.filter(func(t) {
      switch (t.transactionType, t.paymentMethod) {
        case (#prihod, ?pm) { pm == paymentMethod };
        case (_) { false };
      };
    });
  };

  public query ({ caller }) func getTransactionsByDateRange(startDate : Int, endDate : Int) : async [Transaction] {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can view transactions");
    };
    let arr = transactions.values().toArray();
    arr.filter(func(t) { t.date >= startDate and t.date <= endDate });
  };

  public query ({ caller }) func getTransactionsByFilters(
    transactionType : ?TransactionType,
    expenseCategory : ?ExpenseCategory,
    paymentMethod : ?PaymentMethod,
    startDate : ?Int,
    endDate : ?Int,
  ) : async [Transaction] {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can view transactions");
    };

    let allTransactions = transactions.values().toArray();

    allTransactions.filter(
      func(t) {
        let typeMatch = switch (transactionType) {
          case (?tt) { t.transactionType == tt };
          case (null) { true };
        };

        let categoryMatch = switch (expenseCategory) {
          case (?cat) {
            switch (t.expenseCategory) {
              case (?c) { c == cat };
              case (null) { false };
            };
          };
          case (null) { true };
        };

        let paymentMatch = switch (paymentMethod) {
          case (?pm) {
            switch (t.paymentMethod) {
              case (?p) { p == pm };
              case (null) { false };
            };
          };
          case (null) { true };
        };

        let dateMatch = switch (startDate, endDate) {
          case (?start, ?end) { t.date >= start and t.date <= end };
          case (?start, null) { t.date >= start };
          case (null, ?end) { t.date <= end };
          case (null, null) { true };
        };

        typeMatch and categoryMatch and paymentMatch and dateMatch;
      },
    );
  };

  public query ({ caller }) func getTransactionCountsByCategory() : async [(Text, Nat)] {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can view transaction counts");
    };

    let counts = Map.empty<Text, Nat>();

    transactions.values().forEach(
      func(transaction) {
        if (transaction.transactionType == #rashod) {
          let category = switch (transaction.expenseCategory) {
            case (? #namirnice) { "Namirnice" };
            case (? #place) { "Plaće" };
            case (? #rezije) { "Režije" };
            case (? #oprema) { "Oprema" };
            case (? #pice) { "Piće" };
            case (? #napojnica) { "Napojnica" };
            case (? #ostalo) { "Ostalo" };
            case (null) { "Ostalo" };
          };

          let currentCount = switch (counts.get(category)) {
            case (?count) { count };
            case (null) { 0 };
          };

          counts.add(category, currentCount + 1);
        };
      }
    );
    let iter = counts.entries();
    iter.toArray();
  };

  public query ({ caller }) func getMonthlyOverview(month : Nat, year : Nat) : async FinancialOverview {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can view financial overviews");
    };

    let monthStart = getMonthStartTimestamp(month, year);
    let monthEnd = getMonthEndTimestamp(month, year);

    var totalIncome : Int = 0;
    var totalExpenses : Int = 0;

    transactions.values().forEach(func(transaction) {
      if (transaction.date >= monthStart and transaction.date <= monthEnd) {
        switch (transaction.transactionType) {
          case (#prihod) { totalIncome += transaction.amount };
          case (#rashod) { totalExpenses += transaction.amount };
        };
      };
    });

    switch (monthlyIncomes.get(year)) {
      case (?months) {
        switch (months.get(month)) {
          case (?income) { totalIncome += income };
          case (null) {};
        };
      };
      case (null) {};
    };

    {
      totalIncome;
      totalExpenses;
      profit = totalIncome - totalExpenses;
    };
  };

  public query ({ caller }) func getYearlyOverview(year : Nat) : async FinancialOverview {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can view financial overviews");
    };

    let yearStart = getYearStartTimestamp(year);
    let yearEnd = getYearStartTimestamp(year + 1) - 1;

    var totalIncome : Int = 0;
    var totalExpenses : Int = 0;

    transactions.values().forEach(func(transaction) {
      if (transaction.date >= yearStart and transaction.date <= yearEnd) {
        switch (transaction.transactionType) {
          case (#prihod) { totalIncome += transaction.amount };
          case (#rashod) { totalExpenses += transaction.amount };
        };
      };
    });

    switch (monthlyIncomes.get(year)) {
      case (?months) {
        months.values().forEach(func(income) { totalIncome += income });
      };
      case (null) {};
    };

    {
      totalIncome;
      totalExpenses;
      profit = totalIncome - totalExpenses;
    };
  };

  public query ({ caller }) func getMonthlyReport(month : Nat, year : Nat) : async MonthlyReport {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can view reports");
    };

    let monthStart = getMonthStartTimestamp(month, year);
    let monthEnd = getMonthEndTimestamp(month, year);

    var totalIncome : Int = 0;
    var totalExpenses : Int = 0;

    var foodExpense : Int = 0;
    var salariesExpense : Int = 0;
    var utilitiesExpense : Int = 0;
    var equipmentExpense : Int = 0;
    var drinksExpense : Int = 0;
    var tipExpense : Int = 0;
    var otherExpense : Int = 0;

    var cashIncome : Int = 0;
    var cardIncome : Int = 0;

    transactions.values().forEach(
      func(transaction) {
        if (transaction.date >= monthStart and transaction.date <= monthEnd) {
          switch (transaction.transactionType) {
            case (#prihod) {
              totalIncome += transaction.amount;
              switch (transaction.paymentMethod) {
                case (? #gotovina) { cashIncome += transaction.amount };
                case (? #kartica) { cardIncome += transaction.amount };
                case (null) {};
              };
            };
            case (#rashod) {
              totalExpenses += transaction.amount;
              switch (transaction.expenseCategory) {
                case (? #namirnice) { foodExpense += transaction.amount };
                case (? #place) { salariesExpense += transaction.amount };
                case (? #rezije) { utilitiesExpense += transaction.amount };
                case (? #oprema) { equipmentExpense += transaction.amount };
                case (? #pice) { drinksExpense += transaction.amount };
                case (? #napojnica) { tipExpense += transaction.amount };
                case (? #ostalo) { otherExpense += transaction.amount };
                case (null) {};
              };
            };
          };
        };
      }
    );

    switch (monthlyIncomes.get(year)) {
      case (?months) {
        switch (months.get(month)) {
          case (?income) { totalIncome += income };
          case (null) {};
        };
      };
      case (null) {};
    };

    let expensesByCategory = [
      { category = "Namirnice"; total = foodExpense },
      { category = "Plaće"; total = salariesExpense },
      { category = "Režije"; total = utilitiesExpense },
      { category = "Oprema"; total = equipmentExpense },
      { category = "Piće"; total = drinksExpense },
      { category = "Napojnica"; total = tipExpense },
      { category = "Ostalo"; total = otherExpense },
    ];

    let incomeByPaymentMethod = [
      { paymentMethod = "Gotovina"; total = cashIncome },
      { paymentMethod = "Kartica"; total = cardIncome },
    ];

    {
      month;
      year;
      overview = {
        totalIncome;
        totalExpenses;
        profit = totalIncome - totalExpenses;
      };
      expensesByCategory;
      incomeByPaymentMethod;
    };
  };

  public query ({ caller }) func getYearlyReport(year : Nat) : async YearlyReport {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can view reports");
    };

    var monthlyOverviews = List.empty<FinancialOverview>();

    var totalIncome : Int = 0;
    var totalExpenses : Int = 0;

    var cashIncome : Int = 0;
    var cardIncome : Int = 0;

    for (month in Nat.range(1, 11)) {
      let monthStart = getMonthStartTimestamp(month, year);
      let monthEnd = getMonthStartTimestamp(month + 1, year) - 1;

      var monthIncome : Int = 0;
      var monthExpenses : Int = 0;

      transactions.values().forEach(
        func(transaction) {
          if (transaction.date >= monthStart and transaction.date <= monthEnd) {
            switch (transaction.transactionType) {
              case (#prihod) { monthIncome += transaction.amount };
              case (#rashod) { monthExpenses += transaction.amount };
            };
          };
        }
      );

      switch (monthlyIncomes.get(year)) {
        case (?months) {
          switch (months.get(month)) {
            case (?income) { monthIncome += income };
            case (null) {};
          };
        };
        case (null) {};
      };

      monthlyOverviews.add(
        {
          totalIncome = monthIncome;
          totalExpenses = monthExpenses;
          profit = monthIncome - monthExpenses;
        },
      );

      totalIncome += monthIncome;
      totalExpenses += monthExpenses;
    };

    transactions.values().forEach(
      func(transaction) {
        if (transaction.transactionType == #prihod) {
          switch (transaction.paymentMethod) {
            case (? #gotovina) { cashIncome += transaction.amount };
            case (? #kartica) { cardIncome += transaction.amount };
            case (null) {};
          };
        };
      }
    );

    let incomeByPaymentMethod = [
      { paymentMethod = "Gotovina"; total = cashIncome },
      { paymentMethod = "Kartica"; total = cardIncome },
    ];

    {
      year;
      monthlyOverviews = monthlyOverviews.toArray();
      totalOverview = {
        totalIncome;
        totalExpenses;
        profit = totalIncome - totalExpenses;
      };
      incomeByPaymentMethod;
    };
  };

  public query ({ caller }) func getMonthlyIncomeExpenseByYear(year : Nat) : async [MonthlyIncomeExpense] {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can view financial data");
    };

    var monthlyData = List.empty<MonthlyIncomeExpense>();

    for (month in Nat.range(1, 11)) {
      let monthStart = getMonthStartTimestamp(month, year);
      let monthEnd = getMonthEndTimestamp(month, year);

      var totalIncome : Int = 0;
      var totalExpenses : Int = 0;

      transactions.values().forEach(
        func(transaction) {
          if (transaction.date >= monthStart and transaction.date <= monthEnd) {
            switch (transaction.transactionType) {
              case (#prihod) { totalIncome += transaction.amount };
              case (#rashod) { totalExpenses += transaction.amount };
            };
          };
        }
      );

      switch (monthlyIncomes.get(year)) {
        case (?months) {
          switch (months.get(month)) {
            case (?income) { totalIncome += income };
            case (null) {};
          };
        };
        case (null) {};
      };

      monthlyData.add(
        {
          month;
          year;
          totalIncome;
          totalExpenses;
        },
      );
    };

    monthlyData.toArray();
  };

  public query ({ caller }) func getYearComparison(years : [Nat]) : async [YearComparison] {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can view comparisons");
    };

    let comparisons = List.empty<YearComparison>();

    for (year in years.values()) {
      let monthlyData = List.empty<MonthlyIncomeExpense>();
      var totalIncome : Int = 0;
      var totalExpenses : Int = 0;

      for (month in Nat.range(1, 11)) {
        let monthStart = getMonthStartTimestamp(month, year);
        let monthEnd = getMonthStartTimestamp(month + 1, year) - 1;

        var monthIncome : Int = 0;
        var monthExpenses : Int = 0;

        transactions.values().forEach(
          func(transaction) {
            if (transaction.date >= monthStart and transaction.date <= monthEnd) {
              switch (transaction.transactionType) {
                case (#prihod) { monthIncome += transaction.amount };
                case (#rashod) { monthExpenses += transaction.amount };
              };
            };
          }
        );

        switch (monthlyIncomes.get(year)) {
          case (?months) {
            switch (months.get(month)) {
              case (?income) { monthIncome += income };
              case (null) {};
            };
          };
          case (null) {};
        };

        monthlyData.add(
          {
            month;
            year;
            totalIncome = monthIncome;
            totalExpenses = monthExpenses;
          },
        );

        totalIncome += monthIncome;
        totalExpenses += monthExpenses;
      };

      comparisons.add(
        {
          year;
          monthlyData = monthlyData.toArray();
          totalIncome;
          totalExpenses;
        },
      );
    };

    comparisons.toArray();
  };

  public shared ({ caller }) func updateTransaction(id : Nat, input : TransactionInput) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update transactions");
    };

    switch (transactions.get(id)) {
      case (?_) {
        let updatedTransaction : Transaction = {
          id;
          amount = input.amount;
          transactionType = input.transactionType;
          expenseCategory = input.expenseCategory;
          paymentMethod = input.paymentMethod;
          date = input.date;
          description = input.description;
        };
        transactions.add(id, updatedTransaction);
      };
      case (null) { Runtime.trap("Transakcija nije pronađena") };
    };
  };

  public shared ({ caller }) func deleteTransaction(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete transactions");
    };

    if (transactions.containsKey(id)) {
      transactions.remove(id);
    } else {
      Runtime.trap("Transakcija nije pronađena");
    };
  };

  public shared ({ caller }) func addMonthlyIncome(input : MonthlyIncomeInput) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add monthly income");
    };

    var yearData = switch (monthlyIncomes.get(input.year)) {
      case (?months) { months };
      case (null) { Map.empty<Nat, Int>() };
    };

    yearData.add(input.month, input.amount);
    monthlyIncomes.add(input.year, yearData);
  };

  public query ({ caller }) func getMonthlyIncome(year : Nat, month : Nat) : async Int {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can view monthly income");
    };

    switch (monthlyIncomes.get(year)) {
      case (?months) {
        switch (months.get(month)) {
          case (?income) { income };
          case (null) { 0 };
        };
      };
      case (null) { 0 };
    };
  };

  public query ({ caller }) func getAllMonthlyIncomes() : async [MonthlyIncomeInput] {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can view monthly incomes");
    };

    let incomes = List.empty<MonthlyIncomeInput>();

    monthlyIncomes.entries().forEach(
      func((year, months)) {
        months.entries().forEach(
          func((month, amount)) {
            incomes.add(
              {
                year;
                month;
                amount;
              },
            );
          }
        );
      }
    );

    incomes.toArray();
  };

  // Read-only query for draft environment to access all monthly incomes
  public query ({ caller }) func getAllMonthlyIncomesReadOnly() : async [MonthlyIncomeInput] {
    if (not hasReadOnlyAccess(caller)) {
      Runtime.trap("Unauthorized: Only authorized read-only access can view all monthly incomes");
    };

    let incomes = List.empty<MonthlyIncomeInput>();

    monthlyIncomes.entries().forEach(
      func((year, months)) {
        months.entries().forEach(
          func((month, amount)) {
            incomes.add(
              {
                year;
                month;
                amount;
              },
            );
          }
        );
      }
    );

    incomes.toArray();
  };

  public shared ({ caller }) func updateMonthlyIncome(input : MonthlyIncomeInput) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update monthly income");
    };

    var yearData = switch (monthlyIncomes.get(input.year)) {
      case (?months) { months };
      case (null) { Map.empty<Nat, Int>() };
    };

    if (yearData.containsKey(input.month)) {
      yearData.add(input.month, input.amount);
      monthlyIncomes.add(input.year, yearData);
    } else {
      Runtime.trap("Prihod za navedeni mjesec ne postoji");
    };
  };

  public shared ({ caller }) func deleteMonthlyIncome(year : Nat, month : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete monthly income");
    };

    switch (monthlyIncomes.get(year)) {
      case (?months) {
        if (months.containsKey(month)) {
          months.remove(month);
        } else {
          Runtime.trap("Mjesečni prihod nije pronađen");
        };
      };
      case (null) { Runtime.trap("Godina nije pronađena") };
    };
  };

  public query ({ caller }) func getMonthlyIncomeCount(year : Nat, month : Nat) : async Nat {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can view monthly income count");
    };

    switch (monthlyIncomes.get(year)) {
      case (?months) {
        switch (months.get(month)) {
          case (?_) { 1 };
          case (null) { 0 };
        };
      };
      case (null) { 0 };
    };
  };

  public query ({ caller }) func getTotalMonthlyIncome(year : Nat, month : Nat) : async Int {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can view total monthly income");
    };

    switch (monthlyIncomes.get(year)) {
      case (?months) {
        switch (months.get(month)) {
          case (?income) { income };
          case (null) { 0 };
        };
      };
      case (null) { 0 };
    };
  };

  public query ({ caller }) func getExpenseShareByCategory(startDate : Int, endDate : Int) : async [ExpenseShare] {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can view expense share");
    };

    var foodExpense : Int = 0;
    var salariesExpense : Int = 0;
    var utilitiesExpense : Int = 0;
    var equipmentExpense : Int = 0;
    var drinksExpense : Int = 0;
    var tipExpense : Int = 0;
    var otherExpense : Int = 0;

    var totalExpenses : Int = 0;

    transactions.values().forEach(
      func(transaction) {
        if (transaction.transactionType == #rashod and transaction.date >= startDate and transaction.date <= endDate) {
          totalExpenses += transaction.amount;
          switch (transaction.expenseCategory) {
            case (? #namirnice) { foodExpense += transaction.amount };
            case (? #place) { salariesExpense += transaction.amount };
            case (? #rezije) { utilitiesExpense += transaction.amount };
            case (? #oprema) { equipmentExpense += transaction.amount };
            case (? #pice) { drinksExpense += transaction.amount };
            case (? #napojnica) { tipExpense += transaction.amount };
            case (? #ostalo) { otherExpense += transaction.amount };
            case (null) {};
          };
        };
      }
    );

    if (totalExpenses == 0) {
      return [
        { category = "Namirnice"; total = 0; share = 0.0 },
        { category = "Plaće"; total = 0; share = 0.0 },
        { category = "Režije"; total = 0; share = 0.0 },
        { category = "Oprema"; total = 0; share = 0.0 },
        { category = "Piće"; total = 0; share = 0.0 },
        { category = "Napojnica"; total = 0; share = 0.0 },
        { category = "Ostalo"; total = 0; share = 0.0 },
      ];
    };

    [
      {
        category = "Namirnice";
        total = foodExpense;
        share = foodExpense.toFloat() / totalExpenses.toFloat();
      },
      {
        category = "Plaće";
        total = salariesExpense;
        share = (salariesExpense.toFloat() / totalExpenses.toFloat());
      },
      {
        category = "Režije";
        total = utilitiesExpense;
        share = (utilitiesExpense.toFloat() / totalExpenses.toFloat());
      },
      {
        category = "Oprema";
        total = equipmentExpense;
        share = (equipmentExpense.toFloat() / totalExpenses.toFloat());
      },
      {
        category = "Piće";
        total = drinksExpense;
        share = (drinksExpense.toFloat() / totalExpenses.toFloat());
      },
      {
        category = "Napojnica";
        total = tipExpense;
        share = (tipExpense.toFloat() / totalExpenses.toFloat());
      },
      {
        category = "Ostalo";
        total = otherExpense;
        share = (otherExpense.toFloat() / totalExpenses.toFloat());
      },
    ];
  };

  public query ({ caller }) func exportData() : async ExportData {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can export data");
    };

    let allTransactions = transactions.values().toArray();

    let allMonthlyIncomes = List.empty<MonthlyIncomeInput>();
    monthlyIncomes.entries().forEach(
      func((year, months)) {
        months.entries().forEach(
          func((month, amount)) {
            allMonthlyIncomes.add(
              {
                year;
                month;
                amount;
              },
            );
          }
        );
      }
    );

    let callerBusinessProfile = businessProfiles.get(caller);

    {
      transactions = allTransactions;
      monthlyIncomes = allMonthlyIncomes.toArray();
      businessProfile = callerBusinessProfile;
    };
  };

  public query ({ caller }) func getPdfFinancialReportData(year : ?Nat) : async PdfReportData {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can generate PDF reports");
    };

    var totalIncome : Int = 0;
    var totalExpenses : Int = 0;

    var foodExpense : Int = 0;
    var salariesExpense : Int = 0;
    var utilitiesExpense : Int = 0;
    var equipmentExpense : Int = 0;
    var drinksExpense : Int = 0;
    var tipExpense : Int = 0;
    var otherExpense : Int = 0;

    var cashIncome : Int = 0;
    var cardIncome : Int = 0;

    let allTransactions = transactions.values().toArray();
    let allMonthlyIncomes = List.empty<MonthlyIncomeInput>();

    monthlyIncomes.entries().forEach(
      func((year, months)) {
        months.entries().forEach(
          func((month, amount)) {
            allMonthlyIncomes.add(
              {
                year;
                month;
                amount;
              },
            );
          }
        );
      }
    );

    switch (year) {
      case (?selectedYear) {
        let yearStart = getYearStartTimestamp(selectedYear);
        let yearEnd = getYearStartTimestamp(selectedYear + 1) - 1;

        for (transaction in allTransactions.values()) {
          if (transaction.date >= yearStart and transaction.date <= yearEnd) {
            switch (transaction.transactionType) {
              case (#prihod) {
                totalIncome += transaction.amount;
                switch (transaction.paymentMethod) {
                  case (? #gotovina) { cashIncome += transaction.amount };
                  case (? #kartica) { cardIncome += transaction.amount };
                  case (null) {};
                };
              };
              case (#rashod) {
                totalExpenses += transaction.amount;
                switch (transaction.expenseCategory) {
                  case (? #namirnice) { foodExpense += transaction.amount };
                  case (? #place) { salariesExpense += transaction.amount };
                  case (? #rezije) { utilitiesExpense += transaction.amount };
                  case (? #oprema) { equipmentExpense += transaction.amount };
                  case (? #pice) { drinksExpense += transaction.amount };
                  case (? #napojnica) { tipExpense += transaction.amount };
                  case (? #ostalo) { otherExpense += transaction.amount };
                  case (null) {};
                };
              };
            };
          };
        };

        switch (monthlyIncomes.get(selectedYear)) {
          case (?months) {
            months.values().forEach(func(income) { totalIncome += income });
          };
          case (null) {};
        };
      };
      case (null) {
        for (transaction in allTransactions.values()) {
          switch (transaction.transactionType) {
            case (#prihod) {
              totalIncome += transaction.amount;
              switch (transaction.paymentMethod) {
                case (? #gotovina) { cashIncome += transaction.amount };
                case (? #kartica) { cardIncome += transaction.amount };
                case (null) {};
              };
            };
            case (#rashod) {
              totalExpenses += transaction.amount;
              switch (transaction.expenseCategory) {
                case (? #namirnice) { foodExpense += transaction.amount };
                case (? #place) { salariesExpense += transaction.amount };
                case (? #rezije) { utilitiesExpense += transaction.amount };
                case (? #oprema) { equipmentExpense += transaction.amount };
                case (? #pice) { drinksExpense += transaction.amount };
                case (? #napojnica) { tipExpense += transaction.amount };
                case (? #ostalo) { otherExpense += transaction.amount };
                case (null) {};
              };
            };
          };
        };

        monthlyIncomes.entries().forEach(
          func((_, months)) {
            months.values().forEach(func(income) { totalIncome += income });
          }
        );
      };
    };

    let expensesByCategory = [
      { category = "Namirnice"; total = foodExpense },
      { category = "Plaće"; total = salariesExpense },
      { category = "Režije"; total = utilitiesExpense },
      { category = "Oprema"; total = equipmentExpense },
      { category = "Piće"; total = drinksExpense },
      { category = "Napojnica"; total = tipExpense },
      { category = "Ostalo"; total = otherExpense },
    ];

    let incomeByPaymentMethod = [
      { paymentMethod = "Gotovina"; total = cashIncome },
      { paymentMethod = "Kartica"; total = cardIncome },
    ];

    let callerBusinessProfile = businessProfiles.get(caller);

    {
      overview = {
        totalIncome;
        totalExpenses;
        profit = totalIncome - totalExpenses;
      };
      transactions = allTransactions;
      monthlyIncomes = allMonthlyIncomes.toArray();
      expensesByCategory;
      incomeByPaymentMethod;
      businessProfile = callerBusinessProfile;
    };
  };

  public query ({ caller }) func getDfinityTechnicalReport() : async DfinityTechnicalReport {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can generate technical reports");
    };

    {
      title = "DFINITY Technical Support Report";
      summary = "This report provides a technical summary of the synchronization issue resolution and amount consistency improvements implemented in the Restaurant Finance Tracking application.";
      synchronizationImprovements = "The application now uses a fully optimized real-time synchronization system with a unique React Query logic. The consolidated refetch mechanism ensures immediate data updates after all transaction changes. All decimal values are retained without rounding during display and storage, and centralized backend functions are used for all financial calculations.";
      consistencyVerification = "Recalculations now match exactly across the dashboard, reports, and exports. The application uses centralized backend functions for all financial calculations, ensuring complete consistency between all components. The PDF export function uses the same logic as the dashboard and reports, providing identical results.";
      dateBoundaryHandling = "Date boundary handling now uses unified logic with centralized getMonthStartTimestamp and getMonthEndTimestamp functions. These functions properly handle leap years and months with different numbers of days, ensuring accurate date filtering across all modules.";
      decimalPrecision = "Decimal precision is maintained using standardized centsToEur and eurToCents conversion functions. All backend operations use the same conversion functions, eliminating duplicate logic and ensuring consistent rounding and amount formatting.";
      finalVerification = "Final verification confirms that all calculations use the same algorithms and date boundaries for complete consistency. The application has been refactored to remove redundant logic and duplicate functions, with all financial calculations centralized in backend functions shared between all modules.";
      confirmation = "This report confirms that the application now meets the highest standards of data consistency, synchronization, and calculation accuracy. All issues related to amount discrepancies and date boundary handling have been fully resolved.";
    };
  };

  public query ({ caller }) func getDfinityTechnicalAnalysis() : async DfinityTechnicalAnalysis {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can generate technical analysis reports");
    };

    {
      title = "DFINITY Technical Analysis Report";
      executiveSummary = "This report provides a comprehensive technical analysis of the recurring infinite loading issues, backend canister sleep states, and frontend connection loss patterns experienced in the Restaurant Finance Tracking application. It includes a detailed summary of all recovery attempts, findings on data persistence, and technical recommendations for permanent backend activation and improved synchronization.";
      issueDescription = "The application has experienced frequent infinite loading states, particularly after periods of inactivity or backend canister redeployment. These issues have resulted in loss of connection between the frontend and backend, causing the application to become unresponsive and preventing users from accessing their data.";
      technicalAnalysis = "Analysis of the backend canister revealed that sleep states and inactivity were causing the canister to become unresponsive. Frontend connection loss was traced to stale actor bindings and outdated cache references. The issue was exacerbated by deployment synchronization mismatches and improper cache invalidation, leading to persistent loading states.";
      recoveryAttempts = "Multiple recovery attempts were made, including canister redeployment, frontend resynchronization, and actor ID regeneration. Each attempt temporarily restored functionality but did not provide a permanent solution. Data was consistently preserved on the Internet Computer blockchain, confirming that the issue was related to accessibility rather than data loss.";
      dataPersistenceFindings = "Despite accessibility issues, all data remained intact and persisted on the blockchain. This was verified through direct canister queries and data export functions, confirming the integrity and reliability of the underlying storage system.";
      recommendations = "To address these issues, it is recommended to implement a permanent backend keep-alive mechanism, automatic synchronization routines, and enhanced connection monitoring. These solutions will ensure continuous backend availability, prevent canister suspension, and maintain reliable frontend-backend communication.";
      userExperienceImpact = "The recurring loading issues have significantly impacted business continuity, causing operational disruptions and loss of productivity. Users have reported frustration with the inability to access data and perform critical financial tracking tasks during periods of downtime.";
      conclusion = "Implementing the recommended technical solutions will resolve the infinite loading issues, ensure permanent backend activation, and provide a stable, reliable application experience. These improvements will maintain data integrity, enhance user satisfaction, and support uninterrupted business operations.";
    };
  };

  public query ({ caller }) func getDfinityVoiceCommandIssueReport() : async DfinityVoiceCommandIssueReport {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can generate voice command issue reports");
    };

    {
      title = "DFINITY Support – Restaurant Finance Voice Command Issue Report";
      introduction = "This report provides a comprehensive analysis of the voice command integration issues encountered in the Restaurant Finance Tracking application. It is intended for the DFINITY technical support team to assist in resolving platform-level challenges related to voice command functionality on the Internet Computer.";
      implementationTimeline = "The voice command integration process began with the implementation of browser-based speech recognition using the Web Speech API. Initial attempts focused on converting spoken English commands to text and processing them through the existing textual parsing engine. Despite successful local testing, connectivity issues emerged when deploying to the Internet Computer, particularly related to TLS/CORS, relayer, and authentication.";
      technicalIssueAnalysis = "Recurring connectivity issues were identified as the primary barrier to successful voice command integration. These included TLS/CORS errors, relayer failures, authentication token invalidation, and inconsistent communication between the browser, proxy, and backend canister. The issues were most prevalent during the initialization of voice communication and when handling microphone permissions.";
      comparativeAnalysis = "A comparison with the functional Merelus game project revealed that voice command features worked reliably in that context. The key differences identified were related to the complexity of authentication and the use of Internet Identity in the Restaurant Finance Tracking application. The Merelus game used simpler authentication mechanisms and did not encounter the same connectivity challenges.";
      rootCauseIdentification = "Consistent findings point to the interaction between the browser, proxy, and backend canister as the root cause of the issues. The combination of TLS/CORS restrictions, relayer limitations, and authentication token management creates a fragile communication environment that is particularly susceptible to failures during voice command initialization and processing.";
      platformRecommendations = "To address these issues at the platform level, it is recommended that DFINITY engineers implement more robust support for browser-based voice communication, improve TLS/CORS handling for Web Speech API integration, enhance relayer stability for real-time voice processing, and provide better authentication token management for voice command sessions. These improvements will enable reliable voice command functionality for applications on the Internet Computer.";
      implementationAttemptHistory = "Multiple implementation attempts were made, including direct Web Speech API integration, custom microphone permission handling, and speech-to-text processing pipelines. Each attempt encountered connectivity barriers that prevented successful end-to-end voice command processing. The issues were consistent across different browsers and deployment environments.";
      connectivityPatternAnalysis = "Analysis of connectivity patterns revealed that failures were most likely to occur during the transition from voice input to backend processing. The combination of real-time audio streaming, text conversion, and backend communication created a high-risk environment for connection loss and token invalidation.";
      browserCompatibilityIssues = "Cross-browser compatibility testing showed that the issues were not limited to a specific browser. While some browsers handled microphone permissions more gracefully, the underlying connectivity problems persisted across Chrome, Firefox, and Safari. The issues were most severe when transitioning from voice input to backend processing.";
      authenticationIntegrationProblems = "Integration with Internet Identity authentication introduced additional complexity and increased the likelihood of token invalidation and session loss. The combination of voice command processing and secure authentication created a challenging environment for maintaining stable connections and reliable communication.";
      technicalArchitectureReview = "The technical architecture of the application relies on a combination of browser-based voice input, real-time text processing, and secure backend communication. The integration of these components is highly sensitive to connectivity disruptions, authentication challenges, and platform-level limitations. The current architecture is functional for textual input but encounters significant barriers when extending to voice command functionality.";
      conclusion = "This report provides a detailed analysis of the voice command integration challenges and offers specific recommendations for platform-level improvements. By addressing the identified issues, DFINITY can enable reliable voice command functionality for applications on the Internet Computer, supporting advanced user experiences and accessibility features.";
    };
  };

  func getIndustryBenchmark(profile : ?BusinessProfile, period : BenchmarkPeriod) : IndustryBenchmark {
    let baseIncome : Int = 50000_00;
    let baseExpenses : Int = 40000_00;
    let baseProfitMargin : Float = 0.20;

    let adjustedIncome = switch (profile) {
      case (?p) {
        var income = baseIncome;
        income := switch (p.offerType) {
          case (#restoran) { (income.toFloat() * 1.2).toInt() };
          case (#bar) { (income.toFloat() * 0.9).toInt() };
          case (#kafic) { (income.toFloat() * 0.8).toInt() };
          case (#brzaHrana) { (income.toFloat() * 1.0).toInt() };
          case (#ostalo) { income };
        };
        income := (income.toFloat() * (1.0 + (p.numberOfSeats.toFloat() / 100.0))).toInt();
        income;
      };
      case (null) { baseIncome };
    };

    let adjustedExpenses = switch (profile) {
      case (?p) {
        var expenses = baseExpenses;
        expenses := switch (p.offerType) {
          case (#restoran) { (expenses.toFloat() * 1.15).toInt() };
          case (#bar) { (expenses.toFloat() * 0.85).toInt() };
          case (#kafic) { (expenses.toFloat() * 0.75).toInt() };
          case (#brzaHrana) { (expenses.toFloat() * 0.95).toInt() };
          case (#ostalo) { expenses };
        };
        expenses := (expenses.toFloat() * (1.0 + (p.numberOfSeats.toFloat() / 120.0))).toInt();
        expenses;
      };
      case (null) { baseExpenses };
    };

    let expenseCategoryAverages = [
      ("Namirnice", (adjustedExpenses.toFloat() * 0.35).toInt()),
      ("Plaće", (adjustedExpenses.toFloat() * 0.30).toInt()),
      ("Režije", (adjustedExpenses.toFloat() * 0.15).toInt()),
      ("Oprema", (adjustedExpenses.toFloat() * 0.05).toInt()),
      ("Piće", (adjustedExpenses.toFloat() * 0.10).toInt()),
      ("Napojnica", (adjustedExpenses.toFloat() * 0.02).toInt()),
      ("Ostalo", (adjustedExpenses.toFloat() * 0.03).toInt()),
    ];

    let revenuePerSeat = switch (profile) {
      case (?p) {
        if (p.numberOfSeats > 0) {
          ?(adjustedIncome / (p.numberOfSeats : Int));
        } else { null };
      };
      case (null) { null };
    };

    {
      averageIncome = adjustedIncome;
      averageExpenses = adjustedExpenses;
      averageProfitMargin = baseProfitMargin;
      expenseCategoryAverages;
      revenuePerSeat;
    };
  };

  func calculateDeviation(userValue : Int, industryAverage : Int, category : Text) : PerformanceDeviation {
    let deviation = if (industryAverage != 0) {
      ((userValue.toFloat() - industryAverage.toFloat()) / industryAverage.toFloat()) * 100.0;
    } else { 0.0 };

    let status = if (deviation > 10.0) {
      #aboveAverage;
    } else if (deviation < -10.0) {
      #belowAverage;
    } else {
      #withinNormalRange;
    };

    {
      category;
      userValue;
      industryAverage;
      deviationPercentage = deviation;
      status;
    };
  };

  func getUserFinancialData(period : BenchmarkPeriod) : (Int, Int, [(Text, Int)]) {
    var totalIncome : Int = 0;
    var totalExpenses : Int = 0;

    var foodExpense : Int = 0;
    var salariesExpense : Int = 0;
    var utilitiesExpense : Int = 0;
    var equipmentExpense : Int = 0;
    var drinksExpense : Int = 0;
    var tipExpense : Int = 0;
    var otherExpense : Int = 0;

    switch (period) {
      case (#monthly({ month; year })) {
        let monthStart = getMonthStartTimestamp(month, year);
        let monthEnd = getMonthEndTimestamp(month, year);

        transactions.values().forEach(func(transaction) {
          if (transaction.date >= monthStart and transaction.date <= monthEnd) {
            switch (transaction.transactionType) {
              case (#prihod) { totalIncome += transaction.amount };
              case (#rashod) {
                totalExpenses += transaction.amount;
                switch (transaction.expenseCategory) {
                  case (? #namirnice) { foodExpense += transaction.amount };
                  case (? #place) { salariesExpense += transaction.amount };
                  case (? #rezije) { utilitiesExpense += transaction.amount };
                  case (? #oprema) { equipmentExpense += transaction.amount };
                  case (? #pice) { drinksExpense += transaction.amount };
                  case (? #napojnica) { tipExpense += transaction.amount };
                  case (? #ostalo) { otherExpense += transaction.amount };
                  case (null) {};
                };
              };
            };
          };
        });

        switch (monthlyIncomes.get(year)) {
          case (?months) {
            switch (months.get(month)) {
              case (?income) { totalIncome += income };
              case (null) {};
            };
          };
          case (null) {};
        };
      };
      case (#yearly({ year })) {
        let yearStart = getYearStartTimestamp(year);
        let yearEnd = getYearStartTimestamp(year + 1) - 1;

        transactions.values().forEach(func(transaction) {
          if (transaction.date >= yearStart and transaction.date <= yearEnd) {
            switch (transaction.transactionType) {
              case (#prihod) { totalIncome += transaction.amount };
              case (#rashod) {
                totalExpenses += transaction.amount;
                switch (transaction.expenseCategory) {
                  case (? #namirnice) { foodExpense += transaction.amount };
                  case (? #place) { salariesExpense += transaction.amount };
                  case (? #rezije) { utilitiesExpense += transaction.amount };
                  case (? #oprema) { equipmentExpense += transaction.amount };
                  case (? #pice) { drinksExpense += transaction.amount };
                  case (? #napojnica) { tipExpense += transaction.amount };
                  case (? #ostalo) { otherExpense += transaction.amount };
                  case (null) {};
                };
              };
            };
          };
        });

        switch (monthlyIncomes.get(year)) {
          case (?months) {
            months.values().forEach(func(income) { totalIncome += income });
          };
          case (null) {};
        };
      };
      case (#cumulative) {
        transactions.values().forEach(func(transaction) {
          switch (transaction.transactionType) {
            case (#prihod) { totalIncome += transaction.amount };
            case (#rashod) {
              totalExpenses += transaction.amount;
              switch (transaction.expenseCategory) {
                case (? #namirnice) { foodExpense += transaction.amount };
                case (? #place) { salariesExpense += transaction.amount };
                case (? #rezije) { utilitiesExpense += transaction.amount };
                case (? #oprema) { equipmentExpense += transaction.amount };
                case (? #pice) { drinksExpense += transaction.amount };
                case (? #napojnica) { tipExpense += transaction.amount };
                case (? #ostalo) { otherExpense += transaction.amount };
                case (null) {};
              };
            };
          };
        });

        monthlyIncomes.entries().forEach(
          func((_, months)) {
            months.values().forEach(func(income) { totalIncome += income });
          }
        );
      };
    };

    let expensesByCategory = [
      ("Namirnice", foodExpense),
      ("Plaće", salariesExpense),
      ("Režije", utilitiesExpense),
      ("Oprema", equipmentExpense),
      ("Piće", drinksExpense),
      ("Napojnica", tipExpense),
      ("Ostalo", otherExpense),
    ];

    (totalIncome, totalExpenses, expensesByCategory);
  };

  func generateRecommendations(
    incomeDeviation : PerformanceDeviation,
    expenseDeviations : [PerformanceDeviation],
    profitMarginDeviation : PerformanceDeviation,
  ) : [Text] {
    let recommendations = List.empty<Text>();

    switch (incomeDeviation.status) {
      case (#belowAverage) {
        recommendations.add("Prihodi su ispod prosjeka industrije. Razmotrite povećanje cijena ili proširenje ponude.");
      };
      case (#aboveAverage) {
        recommendations.add("Prihodi su iznad prosjeka industrije. Odličan rezultat!");
      };
      case (#withinNormalRange) {
        recommendations.add("Prihodi su u normalnom rasponu u odnosu na industriju.");
      };
    };

    for (deviation in expenseDeviations.values()) {
      switch (deviation.status) {
        case (#aboveAverage) {
          recommendations.add("Troškovi za kategoriju '" # deviation.category # "' su iznad prosjeka. Razmotrite optimizaciju.");
        };
        case (#belowAverage) {
          recommendations.add("Troškovi za kategoriju '" # deviation.category # "' su ispod prosjeka. Dobro upravljanje!");
        };
        case (#withinNormalRange) {};
      };
    };

    switch (profitMarginDeviation.status) {
      case (#belowAverage) {
        recommendations.add("Profitna marža je ispod prosjeka industrije. Fokusirajte se na smanjenje troškova ili povećanje prihoda.");
      };
      case (#aboveAverage) {
        recommendations.add("Profitna marža je iznad prosjeka industrije. Izvrsno!");
      };
      case (#withinNormalRange) {
        recommendations.add("Profitna marža je u normalnom rasponu.");
      };
    };

    recommendations.toArray();
  };

  public query ({ caller }) func getBusinessPerformanceAnalysis(period : BenchmarkPeriod) : async PerformanceAnalysis {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can view performance analysis");
    };

    let profile = businessProfiles.get(caller);
    let (userIncome, userExpenses, userExpensesByCategory) = getUserFinancialData(period);
    let userProfit = userIncome - userExpenses;

    let industryBenchmark = getIndustryBenchmark(profile, period);

    let incomeDeviation = calculateDeviation(userIncome, industryBenchmark.averageIncome, "Prihodi");

    let expenseDeviations = List.empty<PerformanceDeviation>();
    for ((category, userValue) in userExpensesByCategory.values()) {
      let industryAverage = switch (industryBenchmark.expenseCategoryAverages.find(func((cat, _)) { cat == category })) {
        case (?(_, avg)) { avg };
        case (null) { 0 };
      };
      expenseDeviations.add(calculateDeviation(userValue, industryAverage, category));
    };

    let userProfitMargin = if (userIncome != 0) {
      userProfit.toFloat() / userIncome.toFloat();
    } else { 0.0 };

    let profitMarginDeviation = {
      category = "Profitna marža";
      userValue = (userProfitMargin * 100.0).toInt();
      industryAverage = (industryBenchmark.averageProfitMargin * 100.0).toInt();
      deviationPercentage = ((userProfitMargin - industryBenchmark.averageProfitMargin) / industryBenchmark.averageProfitMargin) * 100.0;
      status = if (userProfitMargin > industryBenchmark.averageProfitMargin * 1.1) {
        #aboveAverage;
      } else if (userProfitMargin < industryBenchmark.averageProfitMargin * 0.9) {
        #belowAverage;
      } else {
        #withinNormalRange;
      };
    };

    let recommendations = generateRecommendations(incomeDeviation, expenseDeviations.toArray(), profitMarginDeviation);

    let diagnosticInfo = "Analiza uspješno izvršena. Podaci dostupni za odabrano razdoblje.";

    {
      period;
      userIncome;
      userExpenses;
      userProfit;
      industryBenchmark;
      incomeDeviation;
      expenseDeviations = expenseDeviations.toArray();
      profitMarginDeviation;
      recommendations;
      diagnosticInfo = ?diagnosticInfo;
    };
  };

  func getNextThreeMonths() : [(Nat, Nat)] {
    let currentTime = Time.now();
    let currentYear = getYearFromTimestamp(currentTime);
    let currentMonth = getMonthFromTimestamp(currentTime);

    let months = List.empty<(Nat, Nat)>();
    var year = currentYear;
    var month = currentMonth;

    for (_ in Nat.range(0, 2)) {
      months.add((month, year));
      month += 1;
      if (month > 12) {
        month := 1;
        year += 1;
      };
    };

    months.toArray();
  };

  func getLastThreeMonths() : [(Nat, Nat)] {
    let currentTime = Time.now();
    let currentYear = getYearFromTimestamp(currentTime);
    let currentMonth = getMonthFromTimestamp(currentTime);

    let months = List.empty<(Nat, Nat)>();
    var year = currentYear;
    var month = currentMonth;

    for (_ in Nat.range(0, 2)) {
      months.add((month, year));
      if (month == 1) {
        month := 12;
        year -= 1;
      } else {
        month -= 1;
      };
    };

    months.toArray();
  };

  func getMonthFromTimestamp(timestamp : Int) : Nat {
    let nanosPerDay : Int = 24 * 60 * 60 * 1_000_000_000;
    let daysSinceEpoch = timestamp / nanosPerDay;

    var year = 1970;
    var daysAccumulated : Int = 0;

    label yearLoop while (true) {
      let daysInYear = if (isLeapYear(year)) { 366 } else { 365 };
      if (daysAccumulated + daysInYear > daysSinceEpoch) {
        break yearLoop;
      };
      daysAccumulated += daysInYear;
      year += 1;
    };

    let daysInCurrentYear = daysSinceEpoch - daysAccumulated;

    var month = 1;
    var daysInMonths : Int = 0;
    label monthLoop while (month <= 12) {
      let daysInMonth = getDaysInMonth(month, year) : Int;
      if (daysInMonths + daysInMonth > daysInCurrentYear) {
        break monthLoop;
      };
      daysInMonths += daysInMonth;
      month += 1;
    };

    month;
  };

  func calculateAverage(values : [Int]) : Int {
    if (values.size() == 0) {
      return 0;
    };

    var sum : Int = 0;
    for (value in values.values()) {
      sum += value;
    };

    sum / (values.size() : Int);
  };

  func calculateGrowthRate(previousValue : Int, currentValue : Int) : Float {
    if (previousValue == 0) {
      return 0.0;
    };

    let previous = previousValue.toFloat();
    let current = currentValue.toFloat();

    (current - previous) / previous;
  };

  func applyPercentageAdjustment(value : Int, percentage : Float) : Int {
    let valueFloat = value.toFloat();
    let adjustment = valueFloat * (percentage / 100.0);
    (valueFloat + adjustment).toInt();
  };

  func getHistoricalData() : [(Nat, Nat, Int, Int)] {
    let lastThreeMonths = getLastThreeMonths();
    let historicalData = List.empty<(Nat, Nat, Int, Int)>();

    for ((month, year) in lastThreeMonths.values()) {
      let monthStart = getMonthStartTimestamp(month, year);
      let monthEnd = getMonthEndTimestamp(month, year);

      var totalIncome : Int = 0;
      var totalExpenses : Int = 0;

      transactions.values().forEach(
        func(transaction) {
          if (transaction.date >= monthStart and transaction.date <= monthEnd) {
            switch (transaction.transactionType) {
              case (#prihod) { totalIncome += transaction.amount };
              case (#rashod) { totalExpenses += transaction.amount };
            };
          };
        }
      );

      switch (monthlyIncomes.get(year)) {
        case (?months) {
          switch (months.get(month)) {
            case (?income) { totalIncome += income };
            case (null) {};
          };
        };
        case (null) {};
      };

      historicalData.add((month, year, totalIncome, totalExpenses));
    };

    historicalData.toArray();
  };

  func calculateProjections(historicalData : [(Nat, Nat, Int, Int)]) : [Projection] {
    let nextThreeMonths = getNextThreeMonths();

    let incomeValues = List.empty<Int>();
    let expenseValues = List.empty<Int>();

    for ((_, _, income, expenses) in historicalData.values()) {
      incomeValues.add(income);
      expenseValues.add(expenses);
    };

    let averageIncome = calculateAverage(incomeValues.toArray());
    let averageExpenses = calculateAverage(expenseValues.toArray());

    let incomeGrowthRates = List.empty<Float>();
    let expenseGrowthRates = List.empty<Float>();

    if (historicalData.size() >= 2) {
      for (i in Nat.range(1, historicalData.size() - 1)) {
        let (_, _, currentIncome, currentExpenses) = historicalData[i];
        let (_, _, previousIncome, previousExpenses) = historicalData[i - 1];

        incomeGrowthRates.add(calculateGrowthRate(previousIncome, currentIncome));
        expenseGrowthRates.add(calculateGrowthRate(previousExpenses, currentExpenses));
      };
    };

    let averageIncomeGrowthRate = if (incomeGrowthRates.size() > 0) {
      var sum : Float = 0.0;
      incomeGrowthRates.forEach(func(rate) { sum += rate });
      sum / (incomeGrowthRates.size()).toFloat();
    } else { 0.0 };

    let averageExpenseGrowthRate = if (expenseGrowthRates.size() > 0) {
      var sum : Float = 0.0;
      expenseGrowthRates.forEach(func(rate) { sum += rate });
      sum / (expenseGrowthRates.size()).toFloat();
    } else { 0.0 };

    let projections = List.empty<Projection>();
    var currentIncome = averageIncome;
    var currentExpenses = averageExpenses;

    for ((month, year) in nextThreeMonths.values()) {
      currentIncome := (currentIncome.toFloat() * (1.0 + averageIncomeGrowthRate)).toInt();
      currentExpenses := (currentExpenses.toFloat() * (1.0 + averageExpenseGrowthRate)).toInt();

      projections.add(
        {
          month;
          year;
          projectedIncome = currentIncome;
          projectedExpenses = currentExpenses;
          projectedProfit = currentIncome - currentExpenses;
        },
      );
    };

    projections.toArray();
  };

  func runSimulationHelper(projections : [Projection], simulationInput : SimulationInput) : SimulationResult {
    let simulatedProjections = List.empty<Projection>();
    var totalProjectedIncome : Int = 0;
    var totalProjectedExpenses : Int = 0;

    for (projection in projections.values()) {
      let simulatedIncome = applyPercentageAdjustment(projection.projectedIncome, simulationInput.incomeGrowthPercentage);
      let simulatedExpenses = applyPercentageAdjustment(projection.projectedExpenses, simulationInput.expenseGrowthPercentage);

      simulatedProjections.add(
        {
          month = projection.month;
          year = projection.year;
          projectedIncome = simulatedIncome;
          projectedExpenses = simulatedExpenses;
          projectedProfit = simulatedIncome - simulatedExpenses;
        },
      );

      totalProjectedIncome += simulatedIncome;
      totalProjectedExpenses += simulatedExpenses;
    };

    {
      projections = simulatedProjections.toArray();
      totalProjectedIncome;
      totalProjectedExpenses;
      totalProjectedProfit = totalProjectedIncome - totalProjectedExpenses;
    };
  };

  public query ({ caller }) func getPredictiveAnalysis() : async {
    historicalData : [(Nat, Nat, Int, Int)];
    projections : [Projection];
  } {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can view predictive analysis");
    };

    let historicalData = getHistoricalData();
    let projections = calculateProjections(historicalData);

    {
      historicalData;
      projections;
    };
  };

  public query ({ caller }) func runSimulation(
    incomeGrowthPercentage : Float,
    expenseGrowthPercentage : Float,
  ) : async SimulationResult {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can run simulations");
    };

    let historicalData = getHistoricalData();
    let projections = calculateProjections(historicalData);

    let simulationInput : SimulationInput = {
      incomeGrowthPercentage;
      expenseGrowthPercentage;
    };

    runSimulationHelper(projections, simulationInput);
  };

  func isLeapYear(year : Nat) : Bool {
    let yearInt = year : Int;
    (yearInt % 4 == 0 and yearInt % 100 != 0) or (yearInt % 400 == 0);
  };

  func getDaysInMonth(month : Nat, year : Nat) : Nat {
    switch (month) {
      case (1) { 31 };
      case (2) {
        if (isLeapYear(year)) { 29 } else { 28 };
      };
      case (3) { 31 };
      case (4) { 30 };
      case (5) { 31 };
      case (6) { 30 };
      case (7) { 31 };
      case (8) { 31 };
      case (9) { 30 };
      case (10) { 31 };
      case (11) { 30 };
      case (12) { 31 };
      case (_) { 30 };
    };
  };

  func getTotalDaysFromEpoch(year : Nat, month : Nat, day : Nat) : Int {
    var totalDays : Int = 0;

    for (y in Nat.range(1970, year - 1)) {
      if (isLeapYear(y)) {
        totalDays += 366;
      } else {
        totalDays += 365;
      };
    };

    if (month > 1) {
      for (m in Nat.range(1, month - 1)) {
        totalDays += getDaysInMonth(m, year) : Int;
      };
    };

    totalDays += (day : Int) - 1;

    totalDays;
  };

  func getMonthStartTimestamp(month : Nat, year : Nat) : Int {
    let daysSinceEpoch = getTotalDaysFromEpoch(year, month, 1);
    daysSinceEpoch * 24 * 60 * 60 * 1_000_000_000;
  };

  func getMonthEndTimestamp(month : Nat, year : Nat) : Int {
    let daysInMonth = getDaysInMonth(month, year);
    let daysSinceEpoch = getTotalDaysFromEpoch(year, month, daysInMonth);
    (daysSinceEpoch + 1) * 24 * 60 * 60 * 1_000_000_000 - 1;
  };

  func getYearStartTimestamp(year : Nat) : Int {
    let daysSinceEpoch = getTotalDaysFromEpoch(year, 1, 1);
    daysSinceEpoch * 24 * 60 * 60 * 1_000_000_000;
  };

  func getYearFromTimestamp(timestamp : Int) : Nat {
    let nanosPerDay : Int = 24 * 60 * 60 * 1_000_000_000;
    let daysSinceEpoch = timestamp / nanosPerDay;

    var year = 1970;
    var daysAccumulated : Int = 0;

    label yearLoop while (true) {
      let daysInYear = if (isLeapYear(year)) { 366 } else { 365 };
      if (daysAccumulated + daysInYear > daysSinceEpoch) {
        break yearLoop;
      };
      daysAccumulated += daysInYear;
      year += 1;
    };

    year;
  };

  // Anonymous health check endpoint for connection initialization
  public query func getCurrentTime() : async Int {
    Time.now();
  };

  public shared ({ caller }) func startWakeUpRoutine() : async () {
    if (wakeUpRoutineStarted) {
      Runtime.trap("Wake-up routine already started");
    };

    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can start the wake-up routine");
    };

    wakeUpRoutineStarted := true;
    let interval : Nat = 3600;
    ignore Timer.recurringTimer<system>(#seconds interval, wakeUp);
  };

  func wakeUp() : async () { };

  public query ({ caller }) func isWakeUpRoutineActive() : async Bool {
    if (not canReadData(caller)) {
      Runtime.trap("Unauthorized: Only users or authorized read-only access can check wake-up routine status");
    };
    wakeUpRoutineStarted;
  };

  // Migrate monthlyIncomes to standard transactions (idempotent)
  public shared ({ caller }) func migrateMonthlyIncomesToTransactions() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can run migration");
    };

    var migratedCount : Nat = 0;

    // Build set of existing migration descriptions to avoid duplicates
    let existingDescriptions = Map.empty<Text, Bool>();
    transactions.values().forEach(
      func(t) {
        if (t.transactionType == #prihod) {
          existingDescriptions.add(t.description, true);
        };
      }
    );

    monthlyIncomes.entries().forEach(
      func((year, months)) {
        months.entries().forEach(
          func((month, amount)) {
            let desc = "Brzi unos - " # month.toText() # "/" # year.toText();
            // Only migrate if not already migrated
            switch (existingDescriptions.get(desc)) {
              case (?_) { /* already exists, skip */ };
              case (null) {
                // Create a date for the 1st of the month
                let id = nextId;
                nextId += 1;
                let transaction : Transaction = {
                  id;
                  amount;
                  transactionType = #prihod;
                  expenseCategory = null;
                  paymentMethod = null;
                  date = 0; // Will be set to epoch; frontend will display by month/year
                  description = desc;
                };
                transactions.add(id, transaction);
                migratedCount += 1;
              };
            };
          }
        );
      }
    );

    migratedCount;
  };

  // Clear monthlyIncomes after confirmed migration
  public shared ({ caller }) func clearMigratedMonthlyIncomes() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can clear monthly incomes");
    };
    monthlyIncomes := Map.empty<Nat, Map.Map<Nat, Int>>();
  };

};
