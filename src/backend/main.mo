import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import AccessControl "authorization/access-control";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";

import Array "mo:core/Array";
import Time "mo:core/Time";
import List "mo:core/List";
import Float "mo:core/Float";


actor {
  let storage = Storage.new();
  include MixinStorage(storage);

  let accessControlState = AccessControl.initState();

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
};
