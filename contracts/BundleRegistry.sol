pragma solidity ^0.4.19;


contract BundleRegistry {
  mapping(bytes32 => address) public bundleVendors;

  event BundleAdded(bytes32 bundleId);

  function addBundle(bytes32 bundleId, address vendor) public {
    bundleVendors[bundleId] = vendor;
    BundleAdded(bundleId);
  }
}
